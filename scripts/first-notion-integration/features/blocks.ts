import type { BlockObjectRequest, NestedBlockObjectRequest, PageTemplate } from "../types.ts";

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
  color: "green_background" | "red_background" | "default",
  placeholder: string,
): NestedBlockObjectRequest {
  return {
    object: "block",
    type: "toggle",
    toggle: {
      rich_text: [{ type: "text", text: { content: label } }],
      color,
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: placeholder } }],
          },
        } as NestedBlockObjectRequest,
      ],
    },
  } as NestedBlockObjectRequest;
}

function buildQuestionBlock(
  text: string,
  extraChildren: NestedBlockObjectRequest[] = [],
): NestedBlockObjectRequest {
  return {
    object: "block",
    type: "numbered_list_item",
    numbered_list_item: {
      rich_text: [{ type: "text", text: { content: text } }],
      children: [
        buildToggleBlock("en", "green_background", "tu markdown content 1"),
        buildToggleBlock("pl", "red_background", "tu markdown content 2"),
        buildToggleBlock("more", "default", "tu link do podstrony"),
        ...extraChildren,
      ],
    },
  } as NestedBlockObjectRequest;
}

/**
 * Builds the full block tree for the template.
 *
 * Nesting rules (matching the Obszar page structure):
 * - The first section's heading is wrapped as a child of an empty paragraph block.
 * - Each subsequent section's heading is appended as the final child of the last
 *   question in the preceding section.
 * - Each question becomes a numbered_list_item with three toggle children
 *   (en/green, pl/red, more/default), each toggle containing an empty paragraph.
 */
export function buildBlocks(template: PageTemplate): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = [];

  for (let sectionIdx = 0; sectionIdx < template.sections.length; sectionIdx++) {
    const section = template.sections[sectionIdx];
    const nextSection = template.sections[sectionIdx + 1];

    if (sectionIdx === 0) {
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
      const extraChildren: NestedBlockObjectRequest[] = isLastQuestion && nextSection
        ? [buildHeadingBlock(nextSection.heading)]
        : [];

      blocks.push(buildQuestionBlock(question.text, extraChildren));
    }
  }

  return blocks;
}
