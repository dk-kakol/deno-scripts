import type { PageTemplate } from "./types.ts";

export const DEFAULT_TEMPLATE: PageTemplate = {
  title: "Obszar",
  sections: [
    {
      heading: "Podstawy",
      questions: [{ text: "Pytanie1" }, { text: "Pytanie2" }],
    },
    {
      heading: "Praktyka",
      questions: [{ text: "Pytanie3" }],
    },
  ],
};
