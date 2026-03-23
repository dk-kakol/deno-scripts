import { Client } from "@notionhq/client";

// Top-level block type accepted by pages.create().children
export type BlockObjectRequest = NonNullable<
  Parameters<InstanceType<typeof Client>["pages"]["create"]>[0]["children"]
>[number];

// Narrower type for blocks placed inside other blocks' children arrays.
// Derived from the numbered_list_item.children field to capture the SDK's
// BlockObjectRequestWithoutChildren (excludes types like column_list).
export type NestedBlockObjectRequest = NonNullable<
  Extract<
    BlockObjectRequest,
    { numbered_list_item: { children?: unknown } }
  >["numbered_list_item"]["children"]
>[number];

export interface Question {
  readonly text: string;
}

export interface Section {
  readonly heading: string;
  readonly questions: readonly Question[];
}

export interface PageTemplate {
  readonly title: string;
  readonly sections: readonly Section[];
}
