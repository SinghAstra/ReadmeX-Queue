import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { prisma } from "./prisma.js";
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
const modelName = "gemini-1.5-flash";

if (!GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const gemini = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = gemini.getGenerativeModel({
  model: modelName,
});

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
  let rawResponse;
  for (let i = 0; i < 100; i++) {
    try {
      const filePaths = new Set(files.map((file) => file.path));

      const prompt = `
      You are a code assistant.
      Summarize each of the following files in 1-2 sentences, focusing on its purpose and main functionality. 

      Return your response as a JSON array of objects, ensuring:
      - Return the summaries as a valid JSON array where each object has 'path' and 'summary' properties.
      - All keys and values are strings — the entire JSON must be valid for direct parsing with JSON.parse().

      Example response:
      [
        {"path": "src/file1.js", "summary": "This file contains utility functions for string manipulation."},
        {"path": "src/file2.py", "summary": "This script processes CSV data and generates a report."}
      ]

      Files:
      ${files
        .map(
          (file, index) => `
            ${index + 1}. path: ${file.path}
            content:
            ${file.content}
          `
        )
        .join("\n")}
    `;

      const tokenCount = await estimateTokenCount(prompt);

      await handleRateLimit(tokenCount);

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      rawResponse = result.response.text();
      console.log("rawResponse --generateBatchSummaries : ", rawResponse);

      rawResponse = rawResponse
        .replace(/^```json\s*/i, "") // Remove ```json or ```mdx at start
        .replace(/```$/i, "") // Remove ``` at the end
        .trim();

      const parsedResponse = JSON.parse(rawResponse);
      console.log("parsedResponse --generateBatchSummaries : ", parsedResponse);

      if (!isValidBatchSummaryResponse(parsedResponse, filePaths)) {
        throw new Error("Invalid batch summary response format");
      }

      const summaries: Summary[] = parsedResponse;
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
        console.log("rawResponse is ", rawResponse);
        console.log("error.stack is ", error.stack);
        console.log("error.message is ", error.message);
        console.log("--------------------------------");
      }

      if (
        error instanceof Error &&
        error.message.includes("GoogleGenerativeAI Error")
      ) {
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
  throw new Error("Unexpected error occurred while generating batch summary.");
}

function isValidBatchSummaryResponse(data: any, filePaths: Set<string>) {
  if (!Array.isArray(data)) {
    return false;
  }
  // Validate each item in the array
  for (const item of data) {
    // Ensure item is an object of type Summary and valid path and not null
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.path !== "string" ||
      typeof item.summary !== "string" ||
      !filePaths.has(item.path) ||
      Object.keys(item).length !== 2
    ) {
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
        You are a coding assistant. Generate a well-structured MDX README for a repository using the template below. Fill in the placeholders with content based on the provided information.
        
        **Provided Information:**
        
        - **Owner:** ${repository.owner}
        - **Name:** ${repository.name}
        - **Env keys:** ${repository.env.join(", ")}
        - **File Summaries:**
        ${fileSummaries}
        
        **Template:**
        
        # 📌 [Project Name]
        
        [Description]
        
        ---
        
        ## 🛠️ Tech Stack
        
        [Tech Stack]
        
        ---
        
        ## ✨ Features
        
        [Features]
        
        ---
        
        ## 📂 Folder Structure
        
        [Folder Structure Summary]
        
        ---
        
        ## 🚀 Getting Started
        
        1. Clone the repository: \`git clone https://github.com/${
          repository.owner
        }/${repository.name}\`
        2. Install dependencies: \`[install command]\`
        3. Set up environment variables: Copy \`.env.example\` to \`.env\` and fill in the required values.
        4. Run the application: \`[run command]\`
        
        ---
        
        ## 🔐 Environment Variables
        
        The following environment variables are required:
        
        [Environment Variables]
        
        ---
        
        ## 🤝 Contributing
        
        To contribute:
        
        1. Fork the repository.
        2. Create a new branch: \`git checkout -b feature/your-feature\`
        3. Make your changes and commit: \`git commit -m "Add your message"\`
        4. Push to the branch: \`git push origin feature/your-feature\`
        5. Open a pull request.
        
        For more details, see [Contributing Guidelines](contributing.md).
        
        ---
        
        ## 📬 Contact
        
        - GitHub: [${repository.owner}](https://github.com/${repository.owner})
        
        **Instructions:**
        
        - Replace **[Project Name]** with \`${repository.name}\`.
        - For **[Description]**, generate a concise description (2-3 sentences) of the project’s purpose based on the file summaries. If insufficient data, use a generic description like "A project to streamline [inferred purpose]".
        - For **[Tech Stack]**, infer technologies from file summaries or paths (e.g., "package.json" suggests Node.js, "requirements.txt" suggests Python). List them in bullet points (e.g., "- React"). If unclear, write "Inferred technologies based on files; adjust as needed."
        - For **[Features]**, extract key functionalities from file summaries (e.g., "User authentication" if auth-related files are mentioned). Use bullet points with "✅" (e.g., "- ✅ User authentication"). List 3-5 features, or "To be determined" if insufficient data.
        - For **[Folder Structure Summary]**, summarize main folders and their purposes from file paths (e.g., "src/components: UI elements"). If possible, infer a tree-like structure; otherwise, list key folders in bullet points.
        - For the **Getting Started** section:
          - Infer the language/framework from file summaries/paths.
          - Replace **[install command]** with an appropriate command (e.g., \`npm install\` for Node.js, \`pip install -r requirements.txt\` for Python).
          - Replace **[run command]** with an appropriate command (e.g., \`npm run dev\` for Node.js, \`python app.py\` for Python).
          - If unclear, use generic commands like "Install dependencies using the appropriate package manager" and "Run the application per project docs."
        - For **[Environment Variables]**, list each env key in a bullet point (e.g., "- \`KEY\`"). If empty, write "No environment variables specified."
        - Use MDX formatting: # for headings, - for bullet points, 1. for numbered lists, \` for inline code.
        - Add emojis before headings as shown in the template.
        - Ensure the output is valid MDX without triple backtick wrappers.
        - Generate the MDX content directly as plain text.
        `;

      const tokenCount = await estimateTokenCount(prompt);

      await handleRateLimit(tokenCount);

      const result = await model.generateContent(prompt);

      const readmeContent = result.response.text();

      console.log("readmeContent is ", readmeContent);

      return readmeContent;
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
        console.log(
          `Trying again for ${i + 1} time --generateRepositoryReadme`
        );
        await handleRequestExceeded();
        sleep(i + 1);
        continue;
      }

      throw new Error("Could Not generateRepositoryReadme.");
    }
  }
}

export async function generateRepositoryContribution(repositoryId: string) {
  for (let i = 0; i < 100; i++) {
    try {
      const repository = await prisma.repository.findUnique({
        where: {
          id: repositoryId,
        },
      });

      if (!repository) {
        throw new Error("Repository Not Found in repositoryContribution");
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
        You are a coding assistant. Generate a well-structured MDX README for a repository using the template below. Fill in the placeholders with content based on the provided information.
        
        **Provided Information:**
        
        - **Owner:** ${repository.owner}
        - **Name:** ${repository.name}
        - **Env keys:** ${repository.env.join(", ")}
        - **File Summaries:**
        ${fileSummaries}
        
        This should be the template 📦 Project Setup
Before contributing, make sure to set up the project locally by following the steps in README.md.
📌 Getting an Issue Assigned
Comment on the issue you'd like to work on.

Briefly describe how you plan to solve it.

Wait for confirmation before starting work.

🌱 Working on the Issue
Always create a new branch for your work. Do not use the main branch directly.

Provide progress updates every 24–48 hours. If we don’t hear back, the issue might be reassigned to keep things moving.

✅ Submitting a Pull Request
Ensure your code is well-formatted and follows any existing style conventions.

Include a screenshot or screen recording of your changes in the pull request.

Clearly explain what you've done in the PR description.

Happy Contributing! 🎉
We’re excited to work with you!

        `;

      const tokenCount = await estimateTokenCount(prompt);

      await handleRateLimit(tokenCount);

      const result = await model.generateContent(prompt);

      const repositoryContribution = result.response.text();

      console.log("repositoryContribution is ", repositoryContribution);

      return repositoryContribution;
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
        console.log(`Trying again for ${i + 1} time --repositoryContribution`);
        await handleRequestExceeded();
        sleep(i + 1);
        continue;
      }

      throw new Error("Could Not repositoryContribution.");
    }
  }
}
