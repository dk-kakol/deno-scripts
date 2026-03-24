import { Client } from "@notionhq/client";

export type BlockObjectRequest = NonNullable<
  Parameters<InstanceType<typeof Client>["pages"]["create"]>[0]["children"]
>[number];

export type NestedBlockObjectRequest = NonNullable<
  Extract<
    BlockObjectRequest,
    { numbered_list_item: { children?: unknown } }
  >["numbered_list_item"]["children"]
>[number];

export interface ParsedQuestion {
  readonly text: string;
  readonly answerMarkdowns: readonly string[];
}

export interface ParsedSection {
  readonly heading?: string;
  readonly questions: readonly ParsedQuestion[];
}

export interface ParsedPage {
  readonly title: string;
  readonly introContent?: string;
  readonly sections: readonly ParsedSection[];
}

export interface TranslatedQuestion extends ParsedQuestion {
  readonly translatedMarkdowns: readonly string[];
}

export interface TranslatedSection {
  readonly heading?: string;
  readonly questions: readonly TranslatedQuestion[];
}

export interface TranslatedPage {
  readonly title: string;
  readonly introContent?: string;
  readonly sections: readonly TranslatedSection[];
}
