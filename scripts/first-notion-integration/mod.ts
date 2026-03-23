import { getEnv } from "@shared";
import { Client } from "@notionhq/client";
import { DEFAULT_TEMPLATE } from "./constants.ts";
import { createNotionPage } from "./features/create_page.ts";

export { buildBlocks } from "./features/blocks.ts";
export { createNotionPage } from "./features/create_page.ts";
export { DEFAULT_TEMPLATE } from "./constants.ts";
export type {
  BlockObjectRequest,
  NestedBlockObjectRequest,
  PageTemplate,
  Question,
  Section,
} from "./types.ts";

export async function main(args: string[] = Deno.args): Promise<void> {
  const notionApiKey = getEnv("NOTION_API_KEY");
  const parentPageId = getEnv("NOTION_PAGE_ID");
  const title = args[0] ?? DEFAULT_TEMPLATE.title;
  const template = { ...DEFAULT_TEMPLATE, title };
  const client = new Client({ auth: notionApiKey });
  const pageUrl = await createNotionPage(client, parentPageId, template);
  console.log(pageUrl);
}
