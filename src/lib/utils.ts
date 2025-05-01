export function extractEnvVarsWithRegex(code: string): string[] {
  const regex = /process\.env\.([A-Z0-9_]+)/gi;

  const envVars = new Set<string>();
  let match;

  while ((match = regex.exec(code)) !== null) {
    envVars.add(match[1]);
  }

  return Array.from(envVars);
}
