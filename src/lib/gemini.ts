import { GoogleGenAI, Type } from "@google/genai";

import dotenv from "dotenv";
import { prisma } from "./prisma.js";
import {
  generateBatchSummarySystemPrompt,
  generateRepositoryReadmePrompt,
} from "./prompt.js";
import {
  getGeminiRequestsThisMinuteRedisKey,
  getGeminiTokensConsumedThisMinuteRedisKey,
} from "./redis-keys.js";
import redisClient from "./redis.js";

dotenv.config();

const REQUEST_LIMIT = 12;
const TOKEN_LIMIT = 800000;

type Summary = {
  path: string;
  summary: string;
};

type ParsedSummary = {
  id: string;
  path: string;
  summary: string;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const model = "gemini-1.5-flash";

if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export async function trackRequest(tokenCount: number) {
  const geminiRequestsCountKey = getGeminiRequestsThisMinuteRedisKey();
  const geminiRequestsTokenConsumedKey =
    getGeminiTokensConsumedThisMinuteRedisKey();

  const result = await redisClient
    .multi()
    .incr(geminiRequestsCountKey)
    .incrby(geminiRequestsTokenConsumedKey, tokenCount)
    .expire(geminiRequestsCountKey, 60)
    .expire(geminiRequestsTokenConsumedKey, 60)
    .exec();

  if (!result) {
    throw new Error(
      "Redis connection failed during updating tokens consumed and request count"
    );
  }

  const [requests, tokens] = result.map(([error, response]) => {
    if (error) throw error;
    return response;
  });

  return { requests, tokens };
}

export async function checkLimits() {
  const geminiRequestsCountKey = getGeminiRequestsThisMinuteRedisKey();
  const geminiRequestsTokenConsumedKey =
    getGeminiTokensConsumedThisMinuteRedisKey();

  const [requests, tokens] = await redisClient.mget(
    geminiRequestsCountKey,
    geminiRequestsTokenConsumedKey
  );

  return {
    requests: parseInt(requests ?? "0"),
    tokens: parseInt(tokens ?? "0"),
    requestsExceeded: parseInt(requests ?? "0") >= REQUEST_LIMIT,
    tokensExceeded: parseInt(tokens ?? "0") >= TOKEN_LIMIT,
  };
}

async function sleep(times: number) {
  console.log(`Sleeping for ${2 * times} seconds...`);
  await new Promise((resolve) => setTimeout(resolve, 2000 * times));
}

export async function estimateTokenCount(
  prompt: string,
  maxOutputTokens = 1000
) {
  return Math.ceil(prompt.length / 4) + maxOutputTokens;
}

export async function handleRateLimit(tokenCount: number) {
  const limitsResponse = await checkLimits();

  console.log("--------------------------------------");
  console.log("limitsResponse:", limitsResponse);
  console.log("--------------------------------------");

  const { requestsExceeded, tokensExceeded } = limitsResponse;

  if (requestsExceeded || tokensExceeded) {
    await sleep(1);
  }

  await trackRequest(tokenCount);
}

async function handleRequestExceeded() {
  console.log("-------------------------------");
  console.log("In handleRequest exceeded");
  const geminiRequestsCountKey = getGeminiRequestsThisMinuteRedisKey();
  await redisClient.set(geminiRequestsCountKey, 16);
  const limitsResponse = await checkLimits();
  console.log("limitsResponse:", limitsResponse);
  console.log("-------------------------------");
}

export async function generateBatchSummaries(
  files: { id: string; path: string; content: string | null }[]
) {
  for (let i = 0; i < 100; i++) {
    try {
      const filePaths = new Set(files.map((file) => file.path));

      const prompt = `
      Files:
      ${files
        .map(
          (file, index) =>
            `${index + 1}. path: ${
              file.path
            }\n   content: ${file.content?.substring(0, 500)}...`
        )
        .join("\n")}
      `;

      const tokenCount = await estimateTokenCount(prompt);

      await handleRateLimit(tokenCount);

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.1,
          systemInstruction: generateBatchSummarySystemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING },
                summary: { type: Type.STRING },
              },
              required: ["path", "summary"],
              propertyOrdering: ["path", "summary"],
            },
          },
        },
      });

      if (!response || !response.text) {
        throw new Error("Invalid batch summary response format");
      }

      const result = JSON.parse(response.text);

      if (!isValidBatchSummaryResponse(result, filePaths)) {
        throw new Error("Invalid batch summary response format");
      }

      const summaries: Summary[] = result;
      const parsedSummaries: ParsedSummary[] = summaries.map((summary) => {
        const file = files.find((f) => f.path === summary.path);
        if (!file) {
          throw new Error(
            `File path not found in the provided files array: ${summary.path}`
          );
        }

        return {
          id: file.id,
          path: summary.path,
          summary: summary.summary,
        };
      });

      return parsedSummaries;
    } catch (error) {
      if (error instanceof Error) {
        console.log("--------------------------------");
        console.log("error.stack is ", error.stack);
        console.log("error.message is ", error.message);
        console.log("--------------------------------");
      }

      if (
        error instanceof Error &&
        error.message.includes("GoogleGenerativeAI Error")
      ) {
        console.log(`Trying again for ${i + 1} time --generateBatchSummaries`);
        await handleRequestExceeded();
        sleep(i + 1);
        continue;
      }

      if (
        error instanceof Error &&
        error.message.includes("429 Too Many Requests")
      ) {
        console.log(`Trying again for ${i + 1} time --generateBatchSummaries`);
        await handleRequestExceeded();
        sleep(i + 1);
        continue;
      }

      if (
        error instanceof Error &&
        (error.message.includes("Invalid batch summary response format") ||
          error.stack?.includes("SyntaxError"))
      ) {
        console.log("--------------------------------");
        console.log(`Syntax Error occurred. Trying again for ${i} time`);
        console.log("--------------------------------");
        continue;
      }

      throw new Error(
        error instanceof Error
          ? error.message
          : "Unexpected error occurred while generating batch summary."
      );
    }
  }
  throw new Error(`Could not generate batch summary.`);
}

function isValidBatchSummaryResponse(data: any, filePaths: Set<string>) {
  if (!Array.isArray(data)) {
    console.log("Batch Summary Response is not array.");
    return false;
  }
  // Validate each item in the array
  for (const item of data) {
    if (!filePaths.has(item.path)) {
      console.log("item.path not found in filePaths is ", item.path);
    }

    if (Object.keys(item).length !== 2) {
      console.log("item.keys is not 2 item is ", item);
    }

    // Ensure item is an object of type Summary and valid path and not null
    if (!filePaths.has(item.path) || Object.keys(item).length !== 2) {
      return false;
    }
  }

  return true;
}

export async function generateRepositoryReadme(repositoryId: string) {
  for (let i = 0; i < 100; i++) {
    try {
      const repository = await prisma.repository.findUnique({
        where: {
          id: repositoryId,
        },
      });

      if (!repository) {
        throw new Error("Repository Not Found in generateRepositoryReadme");
      }
      // Fetch all file paths and summaries
      const files = await prisma.file.findMany({
        where: { repositoryId },
        select: { path: true, summary: true },
      });

      // Format file summaries for the prompt
      const fileSummaries = files
        .map(
          (file) => `- ${file.path}: ${file.summary || "No summary available"}`
        )
        .join("\n");

      const prompt = `
        Generate a README.md file based on the following file descriptions:

        - **Name:** ${repository.name}
        - **File Summaries:**${fileSummaries}
        `;

      const tokenCount = await estimateTokenCount(prompt);

      await handleRateLimit(tokenCount);

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: generateRepositoryReadmePrompt,
          temperature: 0.2,
        },
      });

      if (!response || !response.text) {
        throw new Error("Invalid repository overview format");
      }

      // console.log("readmeContent is ", response.text);

      return response.text;
    } catch (error) {
      if (error instanceof Error) {
        console.log("--------------------------------");
        console.log("error.stack is ", error.stack);
        console.log("error.message is ", error.message);
        console.log("--------------------------------");
      }

      if (
        error instanceof Error &&
        error.message.includes("Invalid repository overview format")
      ) {
        console.log("--------------------------------");
        console.log(`Syntax Error occurred. Trying again for ${i} time`);
        console.log("--------------------------------");
        continue;
      }

      if (
        error instanceof Error &&
        error.message.includes("GoogleGenerativeAI Error")
      ) {
        console.log(
          `Trying again for ${i + 1} time --generateRepositoryReadme`
        );
        await handleRequestExceeded();
        sleep(i + 1);
        continue;
      }

      if (
        error instanceof Error &&
        error.message.includes("429 Too Many Requests")
      ) {
        console.log(`Trying again for ${i + 1} time --generateBatchSummaries`);
        await handleRequestExceeded();
        sleep(i + 1);
        continue;
      }

      throw new Error("Could Not generateRepositoryReadme.");
    }
  }
}
