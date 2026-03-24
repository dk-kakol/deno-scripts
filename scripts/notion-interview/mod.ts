import { Client } from "@notionhq/client";
import { getEnv } from "@shared";
import { INPUT_FOLDER, PROMPT_FILE } from "./constants.ts";
import { parseExportFolder } from "./features/parse_export.ts";
import { translatePage } from "./features/translate.ts";
import { createInterviewPage } from "./features/create_page.ts";

export { buildPageBlocks } from "./features/blocks.ts";
export { createInterviewPage } from "./features/create_page.ts";
export { parseExportFolder, parseParentPage } from "./features/parse_export.ts";
export { translatePage } from "./features/translate.ts";
export type {
  BlockObjectRequest,
  NestedBlockObjectRequest,
  ParsedPage,
  ParsedQuestion,
  ParsedSection,
  TranslatedPage,
  TranslatedQuestion,
  TranslatedSection,
} from "./types.ts";

export async function main(): Promise<void> {
  const notionApiKey = getEnv("NOTION_API_KEY");
  const parentPageId = getEnv("NOTION_PAGE_ID");

  const systemPrompt = await Deno.readTextFile(PROMPT_FILE);
  const client = new Client({ auth: notionApiKey });

  const pages = await parseExportFolder(INPUT_FOLDER);
  console.log(`Found ${pages.length} page(s) to process.`);

  for (const page of pages) {
    console.log(`Processing: ${page.title}`);
    const translated = await translatePage(page, systemPrompt);
    const url = await createInterviewPage(client, parentPageId, translated);
    console.log(`Created: ${url}`);
  }
}
