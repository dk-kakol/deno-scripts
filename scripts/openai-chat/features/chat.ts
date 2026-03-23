import { generateText, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";

const DEFAULT_PROMPT = "Say hello and briefly introduce yourself.";

/**
 * Extracts the user prompt from CLI args.
 * Multiple args are joined with spaces. Returns a default if no args are given.
 */
export function parsePrompt(args: string[]): string {
  if (args.length === 0) return DEFAULT_PROMPT;
  return args.join(" ");
}

/**
 * Sends a prompt to the language model and returns the generated text.
 * The `model` parameter defaults to gpt-4o-mini but can be replaced with a
 * mock in tests to avoid real network calls.
 */
export async function chat(
  prompt: string,
  model: LanguageModel = openai("gpt-4o-mini"),
): Promise<string> {
  const { text } = await generateText({
    model,
    messages: [{ role: "user", content: prompt }],
  });
  return text;
}
