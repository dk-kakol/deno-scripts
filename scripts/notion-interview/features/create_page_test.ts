import { assertEquals } from "@std/assert";
import { Client } from "@notionhq/client";
import { createInterviewPage } from "./create_page.ts";
import type { TranslatedPage } from "../types.ts";

type CreateArgs = Parameters<InstanceType<typeof Client>["pages"]["create"]>[0];
type AppendArgs = Parameters<InstanceType<typeof Client>["blocks"]["children"]["append"]>[0];
type ListArgs = Parameters<InstanceType<typeof Client>["blocks"]["children"]["list"]>[0];

interface MockCalls {
  create: CreateArgs[];
  append: AppendArgs[];
  list: ListArgs[];
}

interface MockClient {
  calls: MockCalls;
  client: {
    pages: { create: (args: CreateArgs) => Promise<{ id: string; url: string }> };
    blocks: {
      children: {
        append: (args: AppendArgs) => Promise<{ results: Array<{ id: string }> }>;
        list: (args: ListArgs) => Promise<{ results: Array<{ id: string }> }>;
      };
    };
  };
}

/**
 * Creates a mock client where each append returns a unique block ID and
 * list returns predictable toggle IDs based on the queried block ID.
 */
function makeMockClient(pageUrl = "https://notion.so/test-page"): MockClient {
  const calls: MockCalls = { create: [], append: [], list: [] };
  let idCounter = 0;

  const client = {
    pages: {
      create: (args: CreateArgs) => {
        calls.create.push(args);
        return Promise.resolve({ id: "page-id-123", url: pageUrl });
      },
    },
    blocks: {
      children: {
        append: (args: AppendArgs) => {
          calls.append.push(args);
          const id = `block-${++idCounter}`;
          return Promise.resolve({ results: [{ id }] });
        },
        list: (args: ListArgs) => {
          calls.list.push(args);
          // Return 3 toggle IDs + 1 optional extra child (mirrors numbered_list_item structure)
          return Promise.resolve({
            results: [
              { id: `${args.block_id}-toggle-0` },
              { id: `${args.block_id}-toggle-1` },
              { id: `${args.block_id}-toggle-2` },
            ],
          });
        },
      },
    },
  };

  return { client, calls };
}

function makeSmallPage(): TranslatedPage {
  return {
    title: "Interview Topic",
    sections: [
      {
        heading: "Section A",
        questions: [
          {
            text: "Q1?",
            answerMarkdowns: ["Answer 1"],
            translatedMarkdowns: ["Odpowiedz 1"],
          },
        ],
      },
    ],
  };
}

/** Generates a page where each question has a very long answer (>100 blocks). */
function makePageWithLongAnswer(): TranslatedPage {
  const manyBullets = Array.from({ length: 105 }, (_, i) => `- Bullet point ${i + 1}`).join("\n");
  return {
    title: "Long Answer Page",
    sections: [
      {
        questions: [
          {
            text: "Q with many bullets?",
            answerMarkdowns: [manyBullets],
            translatedMarkdowns: [manyBullets],
          },
        ],
      },
    ],
  };
}

Deno.test("createInterviewPage - creates page with correct title", async () => {
  const { client, calls } = makeMockClient();
  // deno-lint-ignore no-explicit-any
  await createInterviewPage(client as any, "parent-id", makeSmallPage());

  assertEquals(calls.create.length, 1);
  const titleProp = calls.create[0].properties?.title as {
    title: Array<{ text: { content: string } }>;
  };
  assertEquals(titleProp.title[0].text.content, "Interview Topic");
});

Deno.test("createInterviewPage - creates page under correct parent", async () => {
  const { client, calls } = makeMockClient();
  // deno-lint-ignore no-explicit-any
  await createInterviewPage(client as any, "parent-id-xyz", makeSmallPage());

  assertEquals((calls.create[0].parent as { page_id: string }).page_id, "parent-id-xyz");
});

Deno.test("createInterviewPage - returns page URL", async () => {
  const { client } = makeMockClient("https://notion.so/my-page");
  // deno-lint-ignore no-explicit-any
  const url = await createInterviewPage(client as any, "parent-id", makeSmallPage());
  assertEquals(url, "https://notion.so/my-page");
});

Deno.test("createInterviewPage - creates page without children (avoids 413)", async () => {
  const { client, calls } = makeMockClient();
  // deno-lint-ignore no-explicit-any
  await createInterviewPage(client as any, "parent-id", makeSmallPage());
  const children = calls.create[0].children ?? [];
  assertEquals(children.length, 0);
});

Deno.test("createInterviewPage - question blocks trigger children.list for toggle IDs", async () => {
  const { client, calls } = makeMockClient();
  // deno-lint-ignore no-explicit-any
  await createInterviewPage(client as any, "parent-id", makeSmallPage());
  // small page has 1 question → 1 list call to retrieve its toggle IDs
  assertEquals(calls.list.length, 1);
});

Deno.test("createInterviewPage - toggle content appended to toggle IDs not page ID", async () => {
  const { client, calls } = makeMockClient();
  // deno-lint-ignore no-explicit-any
  await createInterviewPage(client as any, "parent-id", makeSmallPage());

  // At least one append should target a toggle ID (not "page-id-123")
  const toggleAppends = calls.append.filter((a) => a.block_id !== "page-id-123");
  assertEquals(toggleAppends.length > 0, true);

  // Toggle IDs follow the pattern returned by the mock list: "<questionId>-toggle-N"
  for (const a of toggleAppends) {
    assertEquals(typeof a.block_id === "string" && a.block_id.includes("-toggle-"), true);
  }
});

Deno.test("createInterviewPage - toggle children exceeding 100 are batched", async () => {
  const { client, calls } = makeMockClient();
  // deno-lint-ignore no-explicit-any
  await createInterviewPage(client as any, "parent-id", makePageWithLongAnswer());

  // Each toggle (en, pl) has 105 bullet blocks → needs 2 batches (100 + 5).
  // The mock list returns IDs like "block-1-toggle-0", "block-1-toggle-1", etc.
  const toggleAppends = calls.append.filter((a) => a.block_id !== "page-id-123");

  // Every batch must respect the ≤ 100 limit
  for (const a of toggleAppends) {
    const count = a.children?.length ?? 0;
    assertEquals(count <= 100, true, `Batch size ${count} exceeds 100`);
  }

  // At least one toggle ID must appear in more than one append call (i.e. was batched)
  const countByToggle = new Map<string, number>();
  for (const a of toggleAppends) {
    countByToggle.set(a.block_id, (countByToggle.get(a.block_id) ?? 0) + 1);
  }
  const hasBatched = [...countByToggle.values()].some((n) => n > 1);
  assertEquals(hasBatched, true, "Expected at least one toggle to need multiple batches");
});
