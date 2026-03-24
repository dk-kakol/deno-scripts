import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { parseExportFolder, parseParentPage } from "./parse_export.ts";

const TESTDATA = "scripts/notion-interview/features/testdata";
const SAMPLE_FILE = `${TESTDATA}/+Sample Page abc123def456abc123def456abc12345.md`;

Deno.test("parseParentPage - title is cleaned (strips + and Notion ID)", async () => {
  const page = await parseParentPage(SAMPLE_FILE);
  assertEquals(page.title, "Sample Page");
});

Deno.test("parseParentPage - intro content is extracted", async () => {
  const page = await parseParentPage(SAMPLE_FILE);
  assertExists(page.introContent);
  assertEquals(page.introContent?.includes("**Pomocne:**"), true);
  assertEquals(page.introContent?.includes("example.com"), true);
});

Deno.test("parseParentPage - section headings are detected", async () => {
  const page = await parseParentPage(SAMPLE_FILE);
  const headings = page.sections.map((s) => s.heading);
  assertEquals(headings.includes("Section One (mental model)"), true);
  assertEquals(headings.includes("Section Two"), true);
});

Deno.test("parseParentPage - Q1 has one answer from subpage", async () => {
  const page = await parseParentPage(SAMPLE_FILE);
  const q1 = page.sections[0].questions[0];
  assertEquals(q1.text, "First question?");
  assertEquals(q1.answerMarkdowns.length, 1);
  assertEquals(q1.answerMarkdowns[0].length > 0, true);
});

Deno.test("parseParentPage - Q2 has two answers (multiple subpages)", async () => {
  const page = await parseParentPage(SAMPLE_FILE);
  const q2 = page.sections[0].questions[1];
  assertEquals(q2.text.startsWith("Second question"), true);
  // Two subpage links: Principles and KISS
  assertEquals(q2.answerMarkdowns.length, 2);
});

Deno.test("parseParentPage - Q2 text includes multiline sub-items", async () => {
  const page = await parseParentPage(SAMPLE_FILE);
  const q2 = page.sections[0].questions[1];
  assertEquals(q2.text.includes("Be consistent"), true);
  assertEquals(q2.text.includes("Pure functions"), true);
});

Deno.test("parseParentPage - answer H1 title line is stripped", async () => {
  const page = await parseParentPage(SAMPLE_FILE);
  const q1 = page.sections[0].questions[0];
  // "# What is answer one?" should be stripped
  assertEquals(q1.answerMarkdowns[0].startsWith("# What"), false);
  assertEquals(q1.answerMarkdowns[0].includes("Core Answer"), true);
});

Deno.test("parseParentPage - subpage link with parentheses in filename works", async () => {
  const page = await parseParentPage(SAMPLE_FILE);
  const q2 = page.sections[0].questions[1];
  // KISS (Keep It Simple, Stupid) subpage should be found and read
  assertEquals(q2.answerMarkdowns.length, 2);
  const kissAnswer = q2.answerMarkdowns[1];
  assertEquals(kissAnswer.includes("Keep It Simple"), true);
});

Deno.test("parseParentPage - missing subpage returns no answer (graceful)", async () => {
  const page = await parseParentPage(SAMPLE_FILE);
  const section1 = page.sections[0];
  // Q3 has no subpage link → answerMarkdowns is empty
  const q3 = section1.questions[2];
  assertEquals(q3.text, "Third question no subpage?");
  assertEquals(q3.answerMarkdowns.length, 0);
});

Deno.test("parseParentPage - second section has correct questions", async () => {
  const page = await parseParentPage(SAMPLE_FILE);
  assertEquals(page.sections.length, 2);
  const section2 = page.sections[1];
  assertEquals(section2.heading, "Section Two");
  assertEquals(section2.questions.length, 1);
  assertEquals(section2.questions[0].text, "Fourth question?");
  assertEquals(section2.questions[0].answerMarkdowns.length, 1);
});

Deno.test("parseExportFolder - finds all parent pages and sorts by title", async () => {
  const pages = await parseExportFolder(TESTDATA);
  assertEquals(pages.length, 2);
  // Sorted alphabetically: "Another Page" before "Sample Page"
  assertEquals(pages[0].title, "Another Page");
  assertEquals(pages[1].title, "Sample Page");
});

Deno.test("parseParentPage - resolves subpage link when directory has mojibake encoding", async () => {
  // Notion exports sometimes produce directory names where non-ASCII chars (e.g. ę = U+0119,
  // UTF-8: C4 99) are stored as different Unicode codepoints (e.g. ─Щ = U+2500 U+0429,
  // UTF-8: E2 94 80 D0 A9). The URL in the markdown still uses the correct encoding (%C4%99).
  // resolvePathFuzzy should find the directory by comparing ASCII-only portions.
  const tmpDir = await Deno.makeTempDir();
  try {
    // Directory name uses mojibake chars ─Щ (U+2500 U+0429) instead of ę (U+0119)
    const mojiDirName = `+Narz\u2500\u0429dzia abc000`;
    await Deno.mkdir(join(tmpDir, mojiDirName));
    await Deno.writeTextFile(
      join(tmpDir, mojiDirName, "Answer abc001.md"),
      "# Title\n\nContent here.\n",
    );

    // Parent file links using the correct URL-encoded ę (%C4%99)
    const parentContent = [
      "# +Test Mojibake abc002",
      "",
      "1. Question?",
      "",
      "[Answer](+Narz%C4%99dzia%20abc000/Answer%20abc001.md)",
    ].join("\n");
    const parentFile = join(tmpDir, "+Test Mojibake abc002.md");
    await Deno.writeTextFile(parentFile, parentContent);

    const page = await parseParentPage(parentFile);
    assertEquals(page.sections[0].questions[0].answerMarkdowns.length, 1);
    assertEquals(page.sections[0].questions[0].answerMarkdowns[0].includes("Content here"), true);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});
