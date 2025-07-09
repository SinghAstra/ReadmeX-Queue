import { RepositoryStatus } from "@prisma/client";
import { Worker } from "bullmq";
import { QUEUES, SUMMARY_WORKERS } from "../lib/constants.js";

import {
  generateBatchSummaries,
  generateRepositoryReadme,
} from "../lib/gemini.js";
import { prisma } from "../lib/prisma.js";
import { checkCompletion } from "../lib/redis/atomic-operations.js";
import {
  getRepositoryCancelledRedisKey,
  getSummaryWorkerCompletedJobsRedisKey,
  getSummaryWorkerTotalJobsRedisKey,
} from "../lib/redis/redis-keys.js";
import redisClient from "../lib/redis/redis.js";
import { logQueue } from "../queues/index.js";

async function generateDocumentationFiles(repositoryId: string) {
  const summaryWorkerTotalJobsKey =
    getSummaryWorkerTotalJobsRedisKey(repositoryId);
  const summaryWorkerCompletedJobsKey =
    getSummaryWorkerCompletedJobsRedisKey(repositoryId);

  // Use atomic check - only one worker will get true when all summaries are complete
  const allSummariesComplete = await checkCompletion(
    summaryWorkerCompletedJobsKey,
    summaryWorkerTotalJobsKey
  );

  if (allSummariesComplete) {
    console.log("-------------------------------------------------------");
    console.log(
      "Inside the if of summaryWorkerCompletedJobs === summaryWorkerTotalJobs"
    );
    console.log("-------------------------------------------------------");

    await logQueue.add(
      QUEUES.LOG,
      {
        repositoryId,
        status: RepositoryStatus.PROCESSING,
        message: "✅ All file summaries successfully generated!",
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );

    const readme = await generateRepositoryReadme(repositoryId);

    await logQueue.add(
      QUEUES.LOG,
      {
        repositoryId,
        status: RepositoryStatus.PROCESSING,
        message: "⏳ Generating readme.md file your repository!",
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );

    await prisma.repository.update({
      where: { id: repositoryId },
      data: { status: RepositoryStatus.SUCCESS, readme },
    });

    await logQueue.add(
      QUEUES.LOG,
      {
        repositoryId,
        status: RepositoryStatus.SUCCESS,
        message:
          "🎉 Amazing! Generated Documentation files for your repository!",
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      }
    );

    await logQueue.add(
      QUEUES.LOG,
      {
        repositoryId,
        status: RepositoryStatus.SUCCESS,
        message: "⏳ Almost there! Redirecting you in a few seconds...",
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
}

export const summaryWorker = new Worker(
  QUEUES.SUMMARY,
  async (job) => {
    console.log("In Summary worker");
    const { repositoryId, files } = job.data;

    const isCancelled = await redisClient.get(
      getRepositoryCancelledRedisKey(repositoryId)
    );

    console.log("files.length is ", files.length);

    if (isCancelled === "true") {
      console.log(`❌ Summary Worker for ${repositoryId} has been cancelled`);
      return;
    }

    const summaryWorkerCompletedJobsKey =
      getSummaryWorkerCompletedJobsRedisKey(repositoryId);

    try {
      // Generate summaries for this batch
      const summaries = await generateBatchSummaries(files);

      console.log("summaries.length is ", summaries.length);

      const updateSummary = summaries.map((summary) => {
        return prisma.file.update({
          where: { id: summary.id },
          data: { summary: summary.summary },
        });
      });

      await prisma.$transaction(updateSummary);

      // Update progress
      await redisClient.incr(summaryWorkerCompletedJobsKey);

      await logQueue.add(
        QUEUES.LOG,
        {
          repositoryId,
          status: RepositoryStatus.PROCESSING,
          message: `🤔 Generating summary for files...`,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
        }
      );

      return { status: "SUCCESS", processed: files.length };
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
      await generateDocumentationFiles(repositoryId);
    }
  },
  {
    connection: redisClient,
    concurrency: SUMMARY_WORKERS,
  }
);

summaryWorker.on("failed", (job, error) => {
  if (error instanceof Error) {
    console.log("error.stack is ", error.stack);
    console.log("error.message is ", error.message);
  }
  console.log("Error occurred in Summary worker");
});

summaryWorker.on("completed", async () => {
  console.log("Summary Worker completed successfully.");
});

// Gracefully shutdown Prisma when worker exits
const shutdown = async () => {
  console.log("Shutting down worker gracefully...");
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
