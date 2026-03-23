import { getEnv } from "@shared";
import { chat, parsePrompt } from "./features/chat.ts";

export { chat, parsePrompt } from "./features/chat.ts";

export async function main(args: string[] = Deno.args): Promise<void> {
  getEnv("OPENAI_API_KEY");
  const prompt = parsePrompt(args);
  console.log(`Prompt: ${prompt}\n`);
  const response = await chat(prompt);
  console.log(response);
}
