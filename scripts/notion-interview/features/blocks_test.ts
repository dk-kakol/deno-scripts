import { assertEquals, assertExists } from "@std/assert";
import { buildPageBlocks } from "./blocks.ts";
import type { TranslatedPage } from "../types.ts";

function makePage(overrides: Partial<TranslatedPage> = {}): TranslatedPage {
  return {
    title: "Test Page",
    sections: [
      {
        heading: "Section A",
        questions: [
          {
            text: "Question 1?",
            answerMarkdowns: ["## Core\n\n- point one"],
            translatedMarkdowns: ["## Rdzen\n\n- punkt jeden"],
          },
        ],
      },
      {
        heading: "Section B",
        questions: [
          {
            text: "Question 2?",
            answerMarkdowns: ["Answer 2"],
            translatedMarkdowns: ["Odpowiedz 2"],
          },
        ],
      },
    ],
    ...overrides,
  };
}

Deno.test("buildPageBlocks - first section heading is wrapped in empty paragraph", () => {
  const blocks = buildPageBlocks(makePage());
  const first = blocks[0] as { type: string; paragraph?: { children?: unknown[] } };
  assertEquals(first.type, "paragraph");
  assertExists((first.paragraph?.children as unknown[])?.[0]);
  const heading = (first.paragraph?.children as Array<{ type: string }>)[0];
  assertEquals(heading.type, "heading_2");
});

Deno.test("buildPageBlocks - second section heading is last child of last question in first section", () => {
  const blocks = buildPageBlocks(makePage());
  // blocks[0] = paragraph wrapper, blocks[1] = question 1 (only question in section A)
  const q1Block = blocks[1] as {
    type: string;
    numbered_list_item?: { children?: Array<{ type: string }> };
  };
  assertEquals(q1Block.type, "numbered_list_item");
  const children = q1Block.numbered_list_item?.children ?? [];
  const lastChild = children[children.length - 1];
  assertEquals(lastChild.type, "heading_2");
});

Deno.test("buildPageBlocks - questions are numbered_list_item", () => {
  const blocks = buildPageBlocks(makePage());
  const questionBlocks = blocks.filter(
    (b) => (b as { type: string }).type === "numbered_list_item",
  );
  assertEquals(questionBlocks.length, 2);
});

Deno.test("buildPageBlocks - each question has en, pl, more toggles", () => {
  const blocks = buildPageBlocks(makePage());
  const q = blocks[1] as {
    numbered_list_item?: {
      children?: Array<
        { type: string; toggle?: { rich_text?: Array<{ text?: { content?: string } }> } }
      >;
    };
  };
  const children = q.numbered_list_item?.children ?? [];
  const toggles = children.filter((c) => c.type === "toggle");
  assertEquals(toggles.length, 3);
  assertEquals(toggles[0].toggle?.rich_text?.[0]?.text?.content, "en");
  assertEquals(toggles[1].toggle?.rich_text?.[0]?.text?.content, "pl");
  assertEquals(toggles[2].toggle?.rich_text?.[0]?.text?.content, "more");
});

Deno.test("buildPageBlocks - en toggle has correct color", () => {
  const blocks = buildPageBlocks(makePage());
  const q = blocks[1] as {
    numbered_list_item?: { children?: Array<{ toggle?: { color?: string } }> };
  };
  const children = q.numbered_list_item?.children ?? [];
  assertEquals(children[0].toggle?.color, "green_background");
  assertEquals(children[1].toggle?.color, "red_background");
  assertEquals(children[2].toggle?.color, "default");
});

Deno.test("buildPageBlocks - en toggle children contain answer blocks", () => {
  const blocks = buildPageBlocks(makePage());
  const q = blocks[1] as {
    numbered_list_item?: {
      children?: Array<{ toggle?: { children?: unknown[] } }>;
    };
  };
  const enToggle = q.numbered_list_item?.children?.[0];
  assertExists(enToggle?.toggle?.children);
  assertEquals((enToggle?.toggle?.children?.length ?? 0) > 0, true);
});

Deno.test("buildPageBlocks - more toggle has empty paragraph placeholder", () => {
  const blocks = buildPageBlocks(makePage());
  const q = blocks[1] as {
    numbered_list_item?: {
      children?: Array<{ toggle?: { children?: Array<{ type: string }> } }>;
    };
  };
  const moreToggle = q.numbered_list_item?.children?.[2];
  assertEquals(moreToggle?.toggle?.children?.[0]?.type, "paragraph");
});

Deno.test("buildPageBlocks - no-heading page starts with numbered_list_item directly", () => {
  const noHeadingPage: TranslatedPage = {
    title: "No Headings",
    sections: [
      {
        questions: [
          {
            text: "Q1?",
            answerMarkdowns: ["A1"],
            translatedMarkdowns: ["T1"],
          },
        ],
      },
    ],
  };
  const blocks = buildPageBlocks(noHeadingPage);
  assertEquals((blocks[0] as { type: string }).type, "numbered_list_item");
});

Deno.test("buildPageBlocks - intro content is prepended as blocks", () => {
  const pageWithIntro = makePage({ introContent: "**Pomocne:** text" });
  const blocksNoIntro = buildPageBlocks(makePage());
  const blocksWithIntro = buildPageBlocks(pageWithIntro);
  assertEquals(blocksWithIntro.length > blocksNoIntro.length, true);
});

Deno.test("buildPageBlocks - multi-answer question has divider in toggle", () => {
  const multiAnswerPage: TranslatedPage = {
    title: "Multi",
    sections: [
      {
        questions: [
          {
            text: "Q?",
            answerMarkdowns: ["Answer 1", "Answer 2"],
            translatedMarkdowns: ["Odp 1", "Odp 2"],
          },
        ],
      },
    ],
  };
  const blocks = buildPageBlocks(multiAnswerPage);
  const q = blocks[0] as {
    numbered_list_item?: {
      children?: Array<{ toggle?: { children?: Array<{ type: string }> } }>;
    };
  };
  const enChildren = q.numbered_list_item?.children?.[0]?.toggle?.children ?? [];
  const hasDivider = enChildren.some((c) => c.type === "divider");
  assertEquals(hasDivider, true);
});

Deno.test("buildPageBlocks - nested sub-bullets become indented paragraphs", () => {
  const nestedPage: TranslatedPage = {
    title: "Nested",
    sections: [
      {
        questions: [
          {
            text: "Q?",
            answerMarkdowns: ["- Item\n  - Sub A\n  - Sub B"],
            translatedMarkdowns: ["- Element\n  - Pod A"],
          },
        ],
      },
    ],
  };
  const blocks = buildPageBlocks(nestedPage);
  const q = blocks[0] as {
    numbered_list_item?: {
      children?: Array<
        {
          toggle?: {
            children?: Array<
              { type: string; paragraph?: { rich_text?: Array<{ text?: { content?: string } }> } }
            >;
          };
        }
      >;
    };
  };
  const enChildren = q.numbered_list_item?.children?.[0]?.toggle?.children ?? [];
  // Top-level item stays as bulleted_list_item
  assertEquals(enChildren[0].type, "bulleted_list_item");
  // Sub-items become paragraphs
  assertEquals(enChildren[1].type, "paragraph");
  assertEquals(enChildren[2].type, "paragraph");
  // Sub-item text has indent prefix
  const subText = enChildren[1].paragraph?.rich_text?.[0]?.text?.content ?? "";
  assertEquals(subText, "  - ");
});

Deno.test("buildPageBlocks - table blocks are kept intact with their rows", () => {
  const tableMarkdown = [
    "| Header A | Header B |",
    "| --- | --- |",
    "| Cell 1 | Cell 2 |",
    "| Cell 3 | Cell 4 |",
  ].join("\n");

  const tablePage: TranslatedPage = {
    title: "Table Test",
    sections: [
      {
        questions: [
          {
            text: "Q?",
            answerMarkdowns: [tableMarkdown],
            translatedMarkdowns: ["placeholder"],
          },
        ],
      },
    ],
  };

  const blocks = buildPageBlocks(tablePage);
  const q = blocks[0] as {
    numbered_list_item?: {
      children?: Array<{ toggle?: { children?: Array<{ type: string; table?: unknown }> } }>;
    };
  };
  const enChildren = q.numbered_list_item?.children?.[0]?.toggle?.children ?? [];
  const tableBlock = enChildren.find((c) => c.type === "table");

  // Table block must be present
  assertEquals(tableBlock !== undefined, true);

  // Table children (rows) must NOT be stripped
  const tableContent = (tableBlock as { table?: { children?: unknown[] } }).table;
  assertEquals(Array.isArray(tableContent?.children), true);
  assertEquals((tableContent?.children?.length ?? 0) > 0, true);
});
