import { RepositoryStatus } from "@prisma/client";
import { Worker } from "bullmq";
import { GitHubContent } from "../interfaces/github.js";
import {
  CONCURRENT_WORKERS,
  FILE_BATCH_SIZE_FOR_AI_SUMMARY,
  FILE_BATCH_SIZE_FOR_PRISMA_TRANSACTION,
  QUEUES,
} from "../lib/constants.js";
import { fetchGithubContent } from "../lib/github.js";
import { prisma } from "../lib/prisma.js";
import { checkCompletion } from "../lib/redis/atomic-operations.js";
import {
  getDirectoryWorkerCompletedJobsRedisKey,
  getDirectoryWorkerTotalJobsRedisKey,
  getRepositoryCancelledRedisKey,
  getSummaryWorkerTotalJobsRedisKey,
} from "../lib/redis/redis-keys.js";
import redisClient from "../lib/redis/redis.js";
import { directoryQueue, logQueue, summaryQueue } from "../queues/index.js";

let dirPath: string;

async function startSummaryWorker(repositoryId: string) {
  try {
    const directoryWorkerTotalJobsKey =
      getDirectoryWorkerTotalJobsRedisKey(repositoryId);
    const directoryWorkerCompletedJobsKey =
      getDirectoryWorkerCompletedJobsRedisKey(repositoryId);
    const summaryWorkerTotalJobsKey =
      getSummaryWorkerTotalJobsRedisKey(repositoryId);

    const allDirectoriesComplete = await checkCompletion(
      directoryWorkerCompletedJobsKey,
      directoryWorkerTotalJobsKey
    );

    if (allDirectoriesComplete) {
      console.log("-------------------------------------------------------");
      console.log(
        "Inside the if of directoryWorkerCompletedJobs === directoryWorkerTotalJobs"
      );
      console.log(`dirPath is ${dirPath}`);
      console.log("-------------------------------------------------------");

      await logQueue.add(
        QUEUES.LOG,
        {
          repositoryId,
          status: RepositoryStatus.PROCESSING,
          message: "🤔 Studying files to create summaries...",
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        }
      );

      // Fetch the Files of the repository that do not have summary
      const filesWithoutSummary = await prisma.file.findMany({
        where: { repositoryId, summary: null },
        select: { id: true, path: true, content: true },
      });

      console.log("filesWithoutSummary.length is ", filesWithoutSummary.length);

      const batchSizeForSummary = FILE_BATCH_SIZE_FOR_AI_SUMMARY;

      const totalBatchesForShortSummary = Math.ceil(
        filesWithoutSummary.length / batchSizeForSummary
      );
      console.log(
        "totalBatchesForShortSummary is ",
        totalBatchesForShortSummary
      );

      redisClient.set(summaryWorkerTotalJobsKey, totalBatchesForShortSummary);

      for (
        let i = 0;
        i < filesWithoutSummary.length;
        i += batchSizeForSummary
      ) {
        const fileWithoutSummaryBatch = filesWithoutSummary.slice(
          i,
          i + batchSizeForSummary
        );

        console.log("Adding Job to Summary queue");

        await summaryQueue.add(QUEUES.SUMMARY, {
          repositoryId,
          files: fileWithoutSummaryBatch,
        });
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log("error.stack is ", error.stack);
      console.log("error.message is ", error.message);
    }
    console.log("Error occurred in start summary worker.");
  }
}

export const directoryWorker = new Worker(
  QUEUES.DIRECTORY,
  async (job) => {
    const { owner, repo, repositoryId, path } = job.data;
    const isCancelled = await redisClient.get(
      getRepositoryCancelledRedisKey(repositoryId)
    );
    if (isCancelled === "true") {
      console.log(`❌ Directory Worker for ${repositoryId} has been cancelled`);
      return;
    }
    dirPath = path;
    const directoryWorkerTotalJobsKey =
      getDirectoryWorkerTotalJobsRedisKey(repositoryId);
    const directoryWorkerCompletedJobsKey =
      getDirectoryWorkerCompletedJobsRedisKey(repositoryId);
    const dirName = path ? path.split("/").pop() : "root";

    try {
      // Fetch only the current directory level (do NOT recurse)
      const { items, envVariables } = await fetchGithubContent(
        owner,
        repo,
        path,
        repositoryId
      );

      if (envVariables.length > 0) {
        const repo = await prisma.repository.findUnique({
          where: { id: repositoryId },
          select: { env: true },
        });

        if (!repo) {
          throw new Error("No repo found while updating envVariables");
        }

        const uniqueEnv = Array.from(new Set([...repo.env, ...envVariables]));

        await prisma.repository.update({
          where: { id: repositoryId },
          data: {
            env: uniqueEnv,
          },
        });
      }

      await logQueue.add(
        QUEUES.LOG,
        {
          repositoryId,
          status: RepositoryStatus.PROCESSING,
          message: `📂 Downloading the ${dirName} directory...`,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        }
      );

      const directories = items.filter((item) => item.type === "dir");

      const files = items.filter((item) => item.type === "file");

      // Update the directory Worker Total Jobs
      redisClient.incrby(directoryWorkerTotalJobsKey, directories.length);

      // Check if Parent Directory exists
      const directory = await prisma.directory.findFirst({
        where: {
          repositoryId,
          path,
        },
      });
      const parentDirId = directory?.id || null;

      const createDirectory = directories.map((dir) => {
        return prisma.directory.create({
          data: {
            path: dir.path,
            repositoryId,
            parentId: parentDirId,
          },
        });
      });

      // Run everything inside a transaction to limit connections
      await prisma.$transaction(createDirectory);

      if (files.length > 0) {
        await processFilesInBatches(files, repositoryId, path, parentDirId);
      }

      // Queue subdirectories for processing
      await Promise.all(
        directories.map(async (dir) => {
          await directoryQueue.add(QUEUES.DIRECTORY, {
            owner,
            repo,
            repositoryId,
            path: dir.path,
          });
        })
      );

      await logQueue.add(
        QUEUES.LOG,
        {
          repositoryId,
          status: RepositoryStatus.PROCESSING,
          message: `✅ Finished downloading the ${dirName} directory`,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        }
      );

      await redisClient.incr(directoryWorkerCompletedJobsKey);

      return { status: "SUCCESS", processed: items.length };
    } catch (error) {
      if (error instanceof Error) {
        console.log("error.stack is ", error.stack);
        console.log("error.message is ", error.message);
      }

      await prisma.repository.update({
        where: { id: repositoryId },
        data: { status: RepositoryStatus.FAILED },
      });

      await logQueue.add(
        QUEUES.LOG,
        {
          repositoryId,
          status: RepositoryStatus.FAILED,
          message:
            error instanceof Error
              ? `⚠️ ${error.message}`
              : "⚠️ Oops! Something went wrong. Please try again later. ",
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        }
      );
    } finally {
      // Check if processing is complete
      await startSummaryWorker(repositoryId);
    }
  },
  {
    connection: redisClient,
    concurrency: CONCURRENT_WORKERS,
  }
);

async function processFilesInBatches(
  files: GitHubContent[],
  repositoryId: string,
  currentPath: string,
  directoryId: string | null
) {
  let dirName = currentPath.split("/").pop();
  dirName = dirName ? dirName : "root";
  try {
    const fileCount = files.length;

    await logQueue.add(
      QUEUES.LOG,
      {
        repositoryId,
        status: RepositoryStatus.PROCESSING,
        message: `📄 Downloading ${fileCount} ${
          fileCount === 1 ? "file" : "files"
        } in ${dirName}...`,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );

    const fileBatches: GitHubContent[][] = [];
    for (
      let i = 0;
      i < files.length;
      i += FILE_BATCH_SIZE_FOR_PRISMA_TRANSACTION
    ) {
      fileBatches.push(
        files.slice(i, i + FILE_BATCH_SIZE_FOR_PRISMA_TRANSACTION)
      );
    }

    for (let i = 0; i < fileBatches.length; i++) {
      const batch = fileBatches[i];

      const createdFiles = await prisma.$transaction(
        batch.map((file) =>
          prisma.file.create({
            data: {
              path: file.path,
              name: file.name,
              content: file.content || "",
              repositoryId,
              directoryId,
            },
          })
        )
      );

      console.log("Files saved in database", createdFiles.length);

      const currentBatch = i + 1;
      const totalBatches = fileBatches.length;
      const progress = Math.round((currentBatch / totalBatches) * 100);

      await logQueue.add(
        QUEUES.LOG,
        {
          repositoryId,
          status: RepositoryStatus.PROCESSING,
          message: `⏳ Saving files in ${dirName}: ${progress}% complete`,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        }
      );
    }

    await logQueue.add(
      QUEUES.LOG,
      {
        repositoryId,
        status: RepositoryStatus.PROCESSING,
        message: `🎉 Successfully downloaded  ${files.length} ${
          files.length === 1 ? "file" : "files"
        } in ${dirName}!`,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      console.log("error.stack is ", error.stack);
      console.log("error.message is ", error.message);
    }

    throw error;
  }
}

directoryWorker.on("failed", (error) => {
  if (error instanceof Error) {
    console.log("error.stack is ", error.stack);
    console.log("error.message is ", error.message);
  }
  console.log("Error occurred in directory worker");
});

directoryWorker.on("completed", async () => {
  console.log("Directory Worker completed successfully.");
});

// Gracefully shutdown Prisma when worker exits
const shutdown = async () => {
  console.log("Shutting down worker gracefully...");
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
