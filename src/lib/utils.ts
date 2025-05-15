export function extractEnvVarsWithRegex(code: string): string[] {
  // console.log("In extract");

  const envRegex = /process\.env\.([a-zA-Z0-9_]+)/gi;

  const envVars = new Set<string>();
  let match;

  while ((match = envRegex.exec(code)) !== null) {
    console.log("In envRegex");
    console.log("match[1] is ", match[1]);
    envVars.add(match[1]);
  }

  const envFnRegex = /env\(\s*['"]([a-zA-Z0-9_]+)['"]\s*\)/gi;
  while ((match = envFnRegex.exec(code)) !== null) {
    console.log("In envFnRegex");
    console.log("match[1] is ", match[1]);
    envVars.add(match[1]);
  }

  return Array.from(envVars);
}
