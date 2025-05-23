# ReadmeX-Queue

This project manages asynchronous jobs for SummaryX, using a queue-based architecture with Redis and interacting with services like GitHub and Google Gemini AI. It provides APIs for adding jobs, cleaning up jobs, and monitoring progress via a Pusher server.

## 🧰 Technology Stack

| Technology       | Purpose/Role                                                             |
| ---------------- | ------------------------------------------------------------------------ |
| Node.js          | Server-side JavaScript runtime environment.                              |
| Express.js       | Web framework for creating RESTful APIs.                                 |
| TypeScript       | Adds static typing to JavaScript.                                        |
| BullMQ           | Queue library for managing asynchronous jobs.                            |
| Redis            | In-memory data store for job queues and caching.                         |
| PostgreSQL       | Relational database for persistent data storage.                         |
| Prisma           | ORM for database access and schema management.                           |
| Octokit          | GitHub API client library.                                               |
| Google Gemini AI | AI model for generating summaries and README content.                    |
| Pusher           | Real-time messaging service for providing processing updates to clients. |

## 📁 File Structure and Purpose

| File Path                                  | Description                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `package.json`                             | Lists project dependencies and scripts.                                               |
| `package-lock.json`                        | Contains the exact versions of all project dependencies.                              |
| `tsconfig.json`                            | Configures the TypeScript compiler.                                                   |
| `src/controllers/queue.ts`                 | Controller functions for managing job queues and adding jobs to process repositories. |
| `src/middleware/verify-clean-job-token.ts` | Middleware to verify Clean Job tokens.                                                |
| `src/middleware/verify-service-token.ts`   | Middleware to verify service tokens.                                                  |
| `src/queues/repository.ts`                 | Defines BullMQ queues for managing different types of repository processing jobs.     |
| `src/routes/clean.ts`                      | Defines Express routes for cleaning jobs.                                             |
| `src/routes/queue.ts`                      | Defines Express route to add jobs to the repository queue.                            |
| `src/lib/constants.ts`                     | Defines constants for queue names, batch sizes, and worker concurrency.               |
| `src/lib/prompt.ts`                        | Functions to generate prompts for AI-based summarization and README generation.       |
| `src/workers/summary.ts`                   | BullMQ worker for processing summary-related tasks.                                   |
| `src/lib/redis-keys.ts`                    | Functions to generate Redis keys for job counts.                                      |
| `src/lib/redis.ts`                         | Establishes a connection to the Redis database.                                       |
| `src/lib/utils.ts`                         | Utility functions, including environment variable extraction.                         |
| `src/workers/log.ts`                       | BullMQ worker for processing log-related tasks.                                       |
| `src/workers/repository.ts`                | BullMQ worker for managing repository-related jobs.                                   |
| `src/lib/pusher/send-update.ts`            | Function to send real-time updates to a Pusher channel.                               |
| `src/lib/pusher/server.ts`                 | Sets up a Pusher server instance.                                                     |
| `src/workers/directory.ts`                 | Worker that processes directory information.                                          |
| `prisma/schema.prisma`                     | Defines the data model for the PostgreSQL database using Prisma.                      |
| `src/lib/cancel-jobs.ts`                   | Functionality to cancel all repository jobs.                                          |
| `src/lib/gemini.ts`                        | Interacts with Google Gemini AI for summarization and README generation.              |
| `src/lib/github.ts`                        | Uses Octokit to interact with GitHub.                                                 |
| `src/lib/prisma.ts`                        | Sets up a Prisma client for database interactions.                                    |
| `src/index.ts`                             | Main application entry point.                                                         |
| `src/interfaces/github.ts`                 | Defines the interface for representing GitHub content.                                |
| `src/controllers/clean.ts`                 | Controller functions for cleaning up jobs and data.                                   |
