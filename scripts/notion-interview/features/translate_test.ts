import { assertEquals } from "@std/assert";
import { MockLanguageModelV1 } from "ai/test";
import type { LanguageModelV1Prompt } from "ai";
import { translatePage } from "./translate.ts";
import type { ParsedPage } from "../types.ts";

const MOCK_TRANSLATION = "przetłumaczono";

function makeMockModel() {
  return new MockLanguageModelV1({
    defaultObjectGenerationMode: undefined,
    doGenerate: () =>
      Promise.resolve({
        rawCall: { rawPrompt: null, rawSettings: {} },
        finishReason: "stop" as const,
        usage: { promptTokens: 10, completionTokens: 10 },
        text: MOCK_TRANSLATION,
      }),
  });
}

const SAMPLE_PAGE: ParsedPage = {
  title: "Clean Code",
  introContent: "**Pomocne:**",
  sections: [
    {
      heading: "Section A",
      questions: [
        { text: "Question 1?", answerMarkdowns: ["Answer 1"] },
        { text: "Question 2?", answerMarkdowns: ["Answer 2a", "Answer 2b"] },
      ],
    },
    {
      heading: "Section B",
      questions: [
        { text: "Question 3?", answerMarkdowns: ["Answer 3"] },
      ],
    },
  ],
};

Deno.test("translatePage - returns translated page with correct structure", async () => {
  const model = makeMockModel();
  const result = await translatePage(SAMPLE_PAGE, "translate to polish", model, 2);

  assertEquals(result.title, "Clean Code");
  assertEquals(result.introContent, "**Pomocne:**");
  assertEquals(result.sections.length, 2);
  assertEquals(result.sections[0].heading, "Section A");
  assertEquals(result.sections[1].heading, "Section B");
});

Deno.test("translatePage - each question has translatedMarkdowns", async () => {
  const model = makeMockModel();
  const result = await translatePage(SAMPLE_PAGE, "translate to polish", model, 2);

  const q1 = result.sections[0].questions[0];
  assertEquals(q1.translatedMarkdowns.length, 1);
  assertEquals(q1.translatedMarkdowns[0], MOCK_TRANSLATION);
});

Deno.test("translatePage - multi-answer question gets correct count of translations", async () => {
  const model = makeMockModel();
  const result = await translatePage(SAMPLE_PAGE, "translate to polish", model, 2);

  const q2 = result.sections[0].questions[1];
  assertEquals(q2.answerMarkdowns.length, 2);
  assertEquals(q2.translatedMarkdowns.length, 2);
  assertEquals(q2.translatedMarkdowns[0], MOCK_TRANSLATION);
  assertEquals(q2.translatedMarkdowns[1], MOCK_TRANSLATION);
});

Deno.test("translatePage - preserves original answerMarkdowns", async () => {
  const model = makeMockModel();
  const result = await translatePage(SAMPLE_PAGE, "translate to polish", model, 1);

  const q2 = result.sections[0].questions[1];
  assertEquals(q2.answerMarkdowns[0], "Answer 2a");
  assertEquals(q2.answerMarkdowns[1], "Answer 2b");
});

Deno.test("translatePage - system prompt is passed to model", async () => {
  const capturedPrompts: string[] = [];
  const model = new MockLanguageModelV1({
    defaultObjectGenerationMode: undefined,
    doGenerate: ({ prompt }) => {
      const systemMsg = (prompt as LanguageModelV1Prompt).find(
        (m): m is { role: "system"; content: string } => m.role === "system",
      );
      capturedPrompts.push(systemMsg?.content ?? "");
      return Promise.resolve({
        rawCall: { rawPrompt: prompt, rawSettings: {} },
        finishReason: "stop" as const,
        usage: { promptTokens: 5, completionTokens: 5 },
        text: "translated",
      });
    },
  });

  const SYSTEM_PROMPT = "You are a translator.";
  await translatePage(SAMPLE_PAGE, SYSTEM_PROMPT, model, 1);

  for (const prompt of capturedPrompts) {
    assertEquals(prompt, SYSTEM_PROMPT);
  }
});

Deno.test("translatePage - concurrency preserves question order", async () => {
  let callCount = 0;
  const delays = [50, 10, 30, 5, 20, 40];
  const model = new MockLanguageModelV1({
    defaultObjectGenerationMode: undefined,
    doGenerate: async () => {
      const idx = callCount++;
      const delay = delays[idx] ?? 10;
      await new Promise((r) => setTimeout(r, delay));
      return {
        rawCall: { rawPrompt: null, rawSettings: {} },
        finishReason: "stop",
        usage: { promptTokens: 1, completionTokens: 1 },
        text: `translation-${idx}`,
      };
    },
  });

  const page: ParsedPage = {
    title: "Test",
    sections: [
      {
        questions: [
          { text: "Q1", answerMarkdowns: ["A1"] },
          { text: "Q2", answerMarkdowns: ["A2"] },
          { text: "Q3", answerMarkdowns: ["A3"] },
        ],
      },
    ],
  };

  const result = await translatePage(page, "prompt", model, 3);
  // Each question should have its own translation in order
  assertEquals(result.sections[0].questions[0].translatedMarkdowns[0], "translation-0");
  assertEquals(result.sections[0].questions[1].translatedMarkdowns[0], "translation-1");
  assertEquals(result.sections[0].questions[2].translatedMarkdowns[0], "translation-2");
});
