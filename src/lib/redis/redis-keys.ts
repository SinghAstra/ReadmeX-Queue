export function getDirectoryWorkerTotalJobsRedisKey(repositoryId: string) {
  return `${repositoryId}:directoryWorkerTotalJobs`;
}

export function getDirectoryWorkerCompletedJobsRedisKey(repositoryId: string) {
  return `${repositoryId}:directoryWorkerCompletedJobs`;
}

export function getSummaryWorkerTotalJobsRedisKey(repositoryId: string) {
  return `${repositoryId}:summaryWorkerTotalJobs`;
}

export function getSummaryWorkerCompletedJobsRedisKey(repositoryId: string) {
  return `${repositoryId}:summaryWorkerCompletedJobs`;
}

export function getRepositoryCancelledRedisKey(repositoryId: string) {
  return `${repositoryId}:cancelled`;
}

export function getGeminiRequestsThisMinuteRedisKey() {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);
  return `${currentMinute}:rateLimitGeminiRequests`;
}
