/**
 * Reads an environment variable and throws a clear error if it is missing or empty.
 * The `.env` file is loaded upstream by Deno's `--env-file` flag — this helper
 * only validates that the variable is present at runtime.
 */
export function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Copy .env.example to .env and set a value for ${key}.`,
    );
  }
  return value;
}
