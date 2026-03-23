import { assertEquals } from "@std/assert";
import { DEFAULT_TEMPLATE } from "../constants.ts";
import type { PageTemplate } from "../types.ts";
import { createNotionPage } from "./create_page.ts";

Deno.test("createNotionPage calls pages.create with correct parent and title", async () => {
  let capturedParams: unknown = null;

  const mockClient = {
    pages: {
      create: (params: unknown) => {
        capturedParams = params;
        return Promise.resolve({
          url: "https://notion.so/mock-page",
          object: "page",
          id: "test-id",
        });
      },
    },
  } as unknown as Parameters<typeof createNotionPage>[0];

  await createNotionPage(mockClient, "parent-page-id-123");

  const params = capturedParams as {
    parent: { page_id: string };
    properties: { title: { title: { text: { content: string } }[] } };
  };
  assertEquals(params.parent.page_id, "parent-page-id-123");
  assertEquals(params.properties.title.title[0].text.content, "Obszar");
});

Deno.test("createNotionPage returns the URL from the API response", async () => {
  const mockClient = {
    pages: {
      create: () =>
        Promise.resolve({
          url: "https://notion.so/created-page",
          object: "page",
          id: "abc",
        }),
    },
  } as unknown as Parameters<typeof createNotionPage>[0];

  const url = await createNotionPage(mockClient, "any-parent-id");
  assertEquals(url, "https://notion.so/created-page");
});

Deno.test("createNotionPage uses custom title when template is provided", async () => {
  let capturedParams: unknown = null;

  const mockClient = {
    pages: {
      create: (params: unknown) => {
        capturedParams = params;
        return Promise.resolve({ url: "https://notion.so/mock", object: "page", id: "id" });
      },
    },
  } as unknown as Parameters<typeof createNotionPage>[0];

  const customTemplate: PageTemplate = { ...DEFAULT_TEMPLATE, title: "My Custom Title" };
  await createNotionPage(mockClient, "parent-id", customTemplate);

  const params = capturedParams as {
    properties: { title: { title: { text: { content: string } }[] } };
  };
  assertEquals(params.properties.title.title[0].text.content, "My Custom Title");
});
