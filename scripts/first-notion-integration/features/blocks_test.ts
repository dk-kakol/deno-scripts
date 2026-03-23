import { assertEquals } from "@std/assert";
import { DEFAULT_TEMPLATE } from "../constants.ts";
import { buildBlocks } from "./blocks.ts";

Deno.test("buildBlocks returns 1 paragraph + N numbered_list_items as top-level blocks", () => {
  const blocks = buildBlocks(DEFAULT_TEMPLATE);
  // 1 paragraph + 2 questions (Podstawy) + 1 question (Praktyka) = 4
  assertEquals(blocks.length, 4);
  assertEquals((blocks[0] as { type: string }).type, "paragraph");
  assertEquals((blocks[1] as { type: string }).type, "numbered_list_item");
  assertEquals((blocks[2] as { type: string }).type, "numbered_list_item");
  assertEquals((blocks[3] as { type: string }).type, "numbered_list_item");
});

Deno.test("buildBlocks first block is empty paragraph with bold Podstawy heading child", () => {
  const blocks = buildBlocks(DEFAULT_TEMPLATE);
  const paragraph = blocks[0] as unknown as {
    type: string;
    paragraph: { rich_text: unknown[]; children: unknown[] };
  };
  assertEquals(paragraph.type, "paragraph");
  assertEquals(paragraph.paragraph.rich_text.length, 0);
  assertEquals(paragraph.paragraph.children.length, 1);

  const heading = paragraph.paragraph.children[0] as {
    type: string;
    heading_2: { rich_text: { text: { content: string }; annotations: { bold: boolean } }[] };
  };
  assertEquals(heading.type, "heading_2");
  assertEquals(heading.heading_2.rich_text[0].text.content, "Podstawy");
  assertEquals(heading.heading_2.rich_text[0].annotations.bold, true);
});

Deno.test("buildBlocks each numbered_list_item has 3 toggles with correct colors", () => {
  const blocks = buildBlocks(DEFAULT_TEMPLATE);

  for (const blockIdx of [1, 2, 3]) {
    const item = blocks[blockIdx] as unknown as {
      numbered_list_item: {
        children: { type: string; toggle?: { color: string } }[];
      };
    };
    const toggles = item.numbered_list_item.children.filter((c) => c.type === "toggle");
    assertEquals(toggles.length, 3, `block ${blockIdx} should have 3 toggles`);
    assertEquals(toggles[0].toggle?.color, "green_background");
    assertEquals(toggles[1].toggle?.color, "red_background");
    assertEquals(toggles[2].toggle?.color, "default");
  }
});

Deno.test("buildBlocks toggles each contain a placeholder paragraph child", () => {
  const blocks = buildBlocks(DEFAULT_TEMPLATE);
  const item = blocks[1] as unknown as {
    numbered_list_item: {
      children: {
        type: string;
        toggle?: {
          rich_text: { text: { content: string } }[];
          children: { type: string; paragraph?: { rich_text: { text: { content: string } }[] } }[];
        };
      }[];
    };
  };
  const toggles = item.numbered_list_item.children.filter((c) => c.type === "toggle");

  assertEquals(toggles[0].toggle?.children.length, 1);
  assertEquals(toggles[0].toggle?.children[0].type, "paragraph");
  assertEquals(
    toggles[0].toggle?.children[0].paragraph?.rich_text[0].text.content,
    "tu markdown content 1",
  );

  assertEquals(toggles[1].toggle?.children.length, 1);
  assertEquals(toggles[1].toggle?.children[0].type, "paragraph");
  assertEquals(
    toggles[1].toggle?.children[0].paragraph?.rich_text[0].text.content,
    "tu markdown content 2",
  );

  assertEquals(toggles[2].toggle?.children.length, 1);
  assertEquals(toggles[2].toggle?.children[0].type, "paragraph");
  assertEquals(
    toggles[2].toggle?.children[0].paragraph?.rich_text[0].text.content,
    "tu link do podstrony",
  );
});

Deno.test("buildBlocks last question of first section has bold Praktyka heading as final child", () => {
  const blocks = buildBlocks(DEFAULT_TEMPLATE);
  // Pytanie2 is blocks[2] (last question in Podstawy section)
  const pytanie2 = blocks[2] as unknown as {
    numbered_list_item: {
      children: {
        type: string;
        heading_2?: { rich_text: { text: { content: string }; annotations: { bold: boolean } }[] };
      }[];
    };
  };
  const children = pytanie2.numbered_list_item.children;
  const lastChild = children[children.length - 1];

  assertEquals(lastChild.type, "heading_2");
  assertEquals(lastChild.heading_2?.rich_text[0].text.content, "Praktyka");
  assertEquals(lastChild.heading_2?.rich_text[0].annotations.bold, true);
});

Deno.test("buildBlocks last section question has no extra children beyond 3 toggles", () => {
  const blocks = buildBlocks(DEFAULT_TEMPLATE);
  const pytanie3 = blocks[3] as unknown as {
    numbered_list_item: { children: { type: string }[] };
  };
  assertEquals(pytanie3.numbered_list_item.children.length, 3);
});
