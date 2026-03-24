import { markdownToBlocks } from "@tryfabric/martian";
import type { BlockObjectRequest, NestedBlockObjectRequest, TranslatedPage } from "../types.ts";
import { TOGGLE_EN_COLOR, TOGGLE_MORE_COLOR, TOGGLE_PL_COLOR } from "../constants.ts";

function buildHeadingBlock(text: string): NestedBlockObjectRequest {
  return {
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [
        {
          type: "text",
          text: { content: text },
          annotations: { bold: true },
        },
      ],
    },
  } as NestedBlockObjectRequest;
}

function buildToggleBlock(
  label: string,
  color: typeof TOGGLE_EN_COLOR | typeof TOGGLE_PL_COLOR | typeof TOGGLE_MORE_COLOR,
  children: NestedBlockObjectRequest[],
): NestedBlockObjectRequest {
  return {
    object: "block",
    type: "toggle",
    toggle: {
      rich_text: [{ type: "text", text: { content: label } }],
      color,
      children,
    },
  } as NestedBlockObjectRequest;
}

const EMPTY_PARAGRAPH: NestedBlockObjectRequest = {
  object: "block",
  type: "paragraph",
  paragraph: { rich_text: [] },
} as NestedBlockObjectRequest;

/**
 * Block types whose `children` are structurally required by the Notion API
 * (e.g. table rows, column_list columns) and must never be stripped or moved
 * to the flat output level.
 */
const STRUCTURAL_BLOCK_TYPES = new Set(["table", "column_list"]);

/**
 * Flattens nested blocks for use inside toggle children (depth 2 in pages.create).
 * Notion forbids depth-3 nesting, so nested children cannot be kept as-is.
 *
 * Strategy:
 * - Structural blocks (table, column_list): kept verbatim — their children are
 *   required by the API and do not represent visual nesting.
 * - Regular top-level blocks (depth 0): children are stripped (nesting removed).
 * - Deeper nested children (depth ≥ 1): converted to paragraph blocks with an
 *   indented "  - text" prefix to preserve visual hierarchy without nesting.
 *
 * Example:
 *   bulleted_list_item "Item" { children: [bulleted_list_item "Sub A"] }
 *   →
 *   bulleted_list_item "Item"
 *   paragraph "  - Sub A"
 */
function flattenWithIndent(
  blocks: NestedBlockObjectRequest[],
  depth = 0,
): NestedBlockObjectRequest[] {
  const result: NestedBlockObjectRequest[] = [];
  for (const block of blocks) {
    const b = block as Record<string, unknown>;
    const type = b.type as string;
    const content = (b[type] as Record<string, unknown>) ?? {};
    const nestedChildren = content.children as NestedBlockObjectRequest[] | undefined;

    if (depth === 0 && STRUCTURAL_BLOCK_TYPES.has(type)) {
      // Keep structural blocks (table/column_list) with their required children intact.
      // Do NOT recurse — rows and columns are handled by the Notion API, not our flattening.
      result.push(block);
      continue;
    }

    if (depth === 0) {
      const { children: _ignored, ...contentWithoutChildren } = content;
      result.push({ ...b, [type]: contentWithoutChildren } as NestedBlockObjectRequest);
    } else {
      const indent = "  ".repeat(depth);
      const originalRichText = (content.rich_text as unknown[]) ?? [];
      result.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: `${indent}- ` } }, ...originalRichText],
        },
      } as NestedBlockObjectRequest);
    }

    if (nestedChildren?.length) {
      result.push(...flattenWithIndent(nestedChildren, depth + 1));
    }
  }
  return result;
}

function markdownToFlatBlocks(markdown: string): NestedBlockObjectRequest[] {
  const blocks = markdownToBlocks(markdown) as unknown as NestedBlockObjectRequest[];
  return flattenWithIndent(blocks);
}

function buildAnswerChildren(markdowns: readonly string[]): NestedBlockObjectRequest[] {
  const children: NestedBlockObjectRequest[] = [];
  for (let i = 0; i < markdowns.length; i++) {
    if (i > 0) {
      children.push({
        object: "block",
        type: "divider",
        divider: {},
      } as NestedBlockObjectRequest);
    }
    children.push(...markdownToFlatBlocks(markdowns[i]));
  }
  return children.length > 0 ? children : [EMPTY_PARAGRAPH];
}

function buildQuestionBlock(
  text: string,
  answerMarkdowns: readonly string[],
  translatedMarkdowns: readonly string[],
  extraChildren: NestedBlockObjectRequest[] = [],
): NestedBlockObjectRequest {
  return {
    object: "block",
    type: "numbered_list_item",
    numbered_list_item: {
      rich_text: [{ type: "text", text: { content: text } }],
      children: [
        buildToggleBlock("en", TOGGLE_EN_COLOR, buildAnswerChildren(answerMarkdowns)),
        buildToggleBlock("pl", TOGGLE_PL_COLOR, buildAnswerChildren(translatedMarkdowns)),
        buildToggleBlock("more", TOGGLE_MORE_COLOR, [EMPTY_PARAGRAPH]),
        ...extraChildren,
      ],
    },
  } as NestedBlockObjectRequest;
}

/**
 * Builds the full block tree for a translated interview page.
 *
 * Nesting rules (matching first-notion-integration structure):
 * - Intro content (if any) is prepended as flat Notion blocks.
 * - First section heading is wrapped as child of an empty paragraph block.
 * - Each subsequent section heading is appended as the last child of the
 *   last question in the preceding section.
 * - Each question becomes a numbered_list_item with en/pl/more toggles
 *   containing the actual answer content via markdownToBlocks.
 */
export function buildPageBlocks(page: TranslatedPage): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];

  if (page.introContent) {
    for (const block of markdownToBlocks(page.introContent)) {
      blocks.push(block as unknown as BlockObjectRequest);
    }
  }

  const hasHeadings = page.sections.some((s) => s.heading !== undefined);

  for (let sectionIdx = 0; sectionIdx < page.sections.length; sectionIdx++) {
    const section = page.sections[sectionIdx];
    const nextSection = page.sections[sectionIdx + 1];

    if (hasHeadings && section.heading && sectionIdx === 0) {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [],
          children: [buildHeadingBlock(section.heading)],
        },
      } as BlockObjectRequest);
    }

    for (let qIdx = 0; qIdx < section.questions.length; qIdx++) {
      const question = section.questions[qIdx];
      const isLastQuestion = qIdx === section.questions.length - 1;

      const extraChildren: NestedBlockObjectRequest[] = [];
      if (hasHeadings && isLastQuestion && nextSection?.heading) {
        extraChildren.push(buildHeadingBlock(nextSection.heading));
      }

      blocks.push(
        buildQuestionBlock(
          question.text,
          question.answerMarkdowns,
          question.translatedMarkdowns,
          extraChildren,
        ) as unknown as BlockObjectRequest,
      );
    }
  }

  return blocks;
}
