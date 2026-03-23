import { assertEquals } from "@std/assert";
import { MockLanguageModelV1 } from "ai/test";
import { chat, parsePrompt } from "./chat.ts";

// ---------------------------------------------------------------------------
// parsePrompt tests
// ---------------------------------------------------------------------------

Deno.test("parsePrompt returns default prompt when no args given", () => {
  const result = parsePrompt([]);
  assertEquals(typeof result, "string");
  assertEquals(result.length > 0, true);
});

Deno.test("parsePrompt returns the single arg as the prompt", () => {
  assertEquals(parsePrompt(["Hello"]), "Hello");
});

Deno.test("parsePrompt joins multiple args with spaces", () => {
  assertEquals(parsePrompt(["Explain", "quantum", "computing"]), "Explain quantum computing");
});

// ---------------------------------------------------------------------------
// chat tests (using MockLanguageModelV1 — no real API calls)
// ---------------------------------------------------------------------------

const mockDoGenerateResult = {
  text: "Mocked response",
  finishReason: "stop" as const,
  usage: { promptTokens: 5, completionTokens: 3 },
  rawCall: { rawPrompt: null, rawSettings: {} },
  warnings: [],
};

Deno.test("chat returns text from the model", async () => {
  const mockModel = new MockLanguageModelV1({
    doGenerate: () => Promise.resolve(mockDoGenerateResult),
  });

  const result = await chat("test prompt", mockModel);
  assertEquals(result, "Mocked response");
});

Deno.test("chat passes the prompt to the model", async () => {
  let capturedPrompt = "";

  const mockModel = new MockLanguageModelV1({
    doGenerate: (options) => {
      const prompt = (options as { prompt: { role: string; content: { text: string }[] }[] })
        .prompt;
      capturedPrompt = prompt[0].content[0].text;
      return Promise.resolve({ ...mockDoGenerateResult, text: "ok" });
    },
  });

  await chat("my specific prompt", mockModel);
  assertEquals(capturedPrompt, "my specific prompt");
});
