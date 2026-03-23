import { Client } from "@notionhq/client";
import { DEFAULT_TEMPLATE } from "../constants.ts";
import type { PageTemplate } from "../types.ts";
import { buildBlocks } from "./blocks.ts";

/**
 * Creates a Notion page under the given parent with the template structure.
 * Returns the URL of the newly created page.
 */
export async function createNotionPage(
  client: InstanceType<typeof Client>,
  parentPageId: string,
  template: PageTemplate = DEFAULT_TEMPLATE,
): Promise<string> {
  const response = await client.pages.create({
    parent: { page_id: parentPageId },
    properties: {
      title: {
        title: [{ type: "text", text: { content: template.title } }],
      },
    },
    children: buildBlocks(template),
  });
  return (response as { url: string }).url;
}
