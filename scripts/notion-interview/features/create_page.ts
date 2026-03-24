import { Client } from "@notionhq/client";
import type { BlockObjectRequest, NestedBlockObjectRequest } from "../types.ts";
import { buildPageBlocks } from "./blocks.ts";
import type { TranslatedPage } from "../types.ts";

type AppendFn = InstanceType<typeof Client>["blocks"]["children"]["append"];
type AppendChildren = NonNullable<Parameters<AppendFn>[0]["children"]>;

function asChildren(blocks: unknown[]): AppendChildren {
  return blocks as AppendChildren;
}

/**
 * Appends a numbered_list_item block using a two-phase approach to stay within
 * Notion's 100-child limit per toggle block:
 *
 * 1. Append the question with empty toggle shells → get the question block ID.
 * 2. List the question's children to get each toggle's block ID.
 * 3. Append answer blocks to each toggle in batches of ≤ 100.
 *
 * Non-toggle children (e.g. heading_2 section labels) are included inline in
 * the shell since they have no children of their own.
 */
async function appendQuestionBlock(
  client: InstanceType<typeof Client>,
  pageId: string,
  block: BlockObjectRequest,
): Promise<void> {
  const b = block as Record<string, unknown>;
  const numItem = b.numbered_list_item as Record<string, unknown>;
  const allChildren = (numItem.children ?? []) as NestedBlockObjectRequest[];

  const toggleData: Array<{ index: number; children: NestedBlockObjectRequest[] }> = [];

  const shellChildren = allChildren.map((child, index) => {
    const c = child as Record<string, unknown>;
    if (c.type === "toggle") {
      const toggleContent = c.toggle as Record<string, unknown>;
      const children = (toggleContent.children ?? []) as NestedBlockObjectRequest[];
      if (children.length > 0) {
        toggleData.push({ index, children });
      }
      return { ...c, toggle: { ...toggleContent, children: [] } };
    }
    return child;
  });

  const shellBlock = { ...b, numbered_list_item: { ...numItem, children: shellChildren } };

  const appendResult = await client.blocks.children.append({
    block_id: pageId,
    children: asChildren([shellBlock]),
  });

  const questionId = (appendResult.results[0] as { id: string }).id;

  if (toggleData.length === 0) return;

  const listResult = await client.blocks.children.list({ block_id: questionId });
  const childIds = listResult.results.map((r) => (r as { id: string }).id);

  for (const { index, children } of toggleData) {
    const toggleId = childIds[index];
    if (!toggleId) continue;

    for (let j = 0; j < children.length; j += 100) {
      await client.blocks.children.append({
        block_id: toggleId,
        children: asChildren(children.slice(j, j + 100)),
      });
    }
  }
}

/**
 * Creates a Notion page for a translated interview topic under the given parent.
 * Uses a two-phase append for question blocks to stay within Notion's block limits.
 * Returns the URL of the newly created page.
 */
export async function createInterviewPage(
  client: InstanceType<typeof Client>,
  parentPageId: string,
  page: TranslatedPage,
): Promise<string> {
  const allBlocks = buildPageBlocks(page);

  const response = await client.pages.create({
    parent: { page_id: parentPageId },
    properties: {
      title: {
        title: [{ type: "text", text: { content: page.title } }],
      },
    },
  });

  const pageId = response.id;
  const pageUrl = (response as { url: string }).url;

  for (const block of allBlocks) {
    const b = block as Record<string, unknown>;
    if (b.type === "numbered_list_item") {
      await appendQuestionBlock(client, pageId, block);
    } else {
      await client.blocks.children.append({
        block_id: pageId,
        children: asChildren([block]),
      });
    }
  }

  return pageUrl;
}

export type { BlockObjectRequest };
