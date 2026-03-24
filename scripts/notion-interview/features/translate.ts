import { generateText, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { CONCURRENCY_LIMIT } from "../constants.ts";
import type { ParsedPage, TranslatedPage, TranslatedQuestion } from "../types.ts";

async function translateOne(
  text: string,
  systemPrompt: string,
  model: LanguageModel,
): Promise<string> {
  const { text: result } = await generateText({
    model,
    system: systemPrompt,
    messages: [{ role: "user", content: text }],
  });
  return result;
}

async function translateAll(
  answers: readonly string[],
  systemPrompt: string,
  model: LanguageModel,
  concurrency: number,
): Promise<string[]> {
  const results = new Array<string>(answers.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < answers.length) {
      const i = nextIndex++;
      results[i] = await translateOne(answers[i], systemPrompt, model);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

export async function translatePage(
  page: ParsedPage,
  systemPrompt: string,
  model: LanguageModel = openai("gpt-4o-mini"),
  concurrency = CONCURRENCY_LIMIT,
): Promise<TranslatedPage> {
  const allAnswers: string[] = page.sections
    .flatMap((s) => s.questions)
    .flatMap((q) => [...q.answerMarkdowns]);

  const allTranslated = await translateAll(allAnswers, systemPrompt, model, concurrency);

  let offset = 0;
  const sections = page.sections.map((section) => ({
    heading: section.heading,
    questions: section.questions.map((q): TranslatedQuestion => {
      const count = q.answerMarkdowns.length;
      const translatedMarkdowns = allTranslated.slice(offset, offset + count);
      offset += count;
      return { text: q.text, answerMarkdowns: q.answerMarkdowns, translatedMarkdowns };
    }),
  }));

  return { title: page.title, introContent: page.introContent, sections };
}
