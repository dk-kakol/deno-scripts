import { dirname, join } from "@std/path";
import type { ParsedPage, ParsedQuestion, ParsedSection } from "../types.ts";

/** Replace non-breaking spaces with regular spaces for consistent comparisons. */
function normalizeSpaces(text: string): string {
  return text.replace(/\u00a0/g, " ");
}

function cleanTitle(raw: string): string {
  const normalized = normalizeSpaces(raw);
  const noPlus = normalized.startsWith("+") ? normalized.slice(1).trim() : normalized.trim();
  return noPlus.replace(/\s+[0-9a-f]{32}$/, "").trim();
}

/**
 * A section heading is a line whose entire content is bold text, optionally
 * preceded by an emoji+space prefix. Covers these patterns:
 *   **text**
 *   **emoji text**
 *   🏗️ **text**
 */
function isBoldHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^(\S+\s+)?\*\*[^*]+\*\*$/.test(trimmed);
}

function extractHeadingText(line: string): string {
  const trimmed = normalizeSpaces(line.trim());
  const emojiMatch = trimmed.match(/^\S+\s+\*\*([^*]+)\*\*$/);
  if (emojiMatch) return emojiMatch[1].trim();
  const boldMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
  if (boldMatch) return boldMatch[1].trim();
  return trimmed;
}

/** Returns the decoded relative path if the line is a subpage link to a .md file. */
function extractSubpageLinkPath(line: string): string | null {
  const trimmed = line.trim();
  // Use greedy .+ to handle parentheses inside the URL (e.g. KISS (Keep It Simple, Stupid))
  const match = trimmed.match(/^\[([^\]]+)\]\((.+)\)$/);
  if (!match) return null;
  const rawPath = match[2];
  if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) return null;
  if (!rawPath.endsWith(".md")) return null;
  return decodeURIComponent(rawPath);
}

/**
 * Strips all non-ASCII characters for fuzzy path component matching.
 * Notion exports sometimes produce mojibake directory/file names where
 * non-ASCII characters (e.g. ę) are stored with different bytes than what
 * the URL-decoded path expects. Since every Notion filename contains a
 * unique 32-char hex ID, stripping non-ASCII still guarantees uniqueness.
 */
function stripNonAscii(s: string): string {
  // deno-lint-ignore no-control-regex
  return s.replace(/[^\x00-\x7F]/g, "");
}

/**
 * Resolves a multi-component path under `baseDir`, falling back to a fuzzy
 * match (ASCII-only comparison) for any component that is not found verbatim.
 * Returns the resolved absolute path or null if any component is unresolvable.
 */
async function resolvePathFuzzy(baseDir: string, relPath: string): Promise<string | null> {
  const parts = relPath.split("/");
  let current = baseDir;

  for (const part of parts) {
    const exact = join(current, part);
    try {
      await Deno.stat(exact);
      current = exact;
      continue;
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) throw e;
    }

    // Exact match failed → scan the directory for a fuzzy match
    const normalizedPart = stripNonAscii(part).toLowerCase();
    let resolved: string | null = null;
    try {
      for await (const entry of Deno.readDir(current)) {
        if (stripNonAscii(entry.name).toLowerCase() === normalizedPart) {
          resolved = join(current, entry.name);
          break;
        }
      }
    } catch {
      return null;
    }

    if (!resolved) return null;
    current = resolved;
  }

  return current;
}

async function readSubpageContent(folderPath: string, linkPath: string): Promise<string | null> {
  const resolvedPath = await resolvePathFuzzy(folderPath, linkPath);
  if (!resolvedPath) return null;

  let content: string;
  try {
    content = await Deno.readTextFile(resolvedPath);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) return null;
    throw e;
  }
  const lines = content.split("\n");
  const h1Idx = lines.findIndex((l) => l.startsWith("# "));
  const afterH1 = h1Idx >= 0 ? lines.slice(h1Idx + 1) : lines;
  let start = 0;
  while (start < afterH1.length && afterH1[start].trim() === "") start++;
  return afterH1.slice(start).join("\n").trimEnd();
}

export async function parseParentPage(filePath: string): Promise<ParsedPage> {
  const content = await Deno.readTextFile(filePath);
  const lines = content.split("\n");
  const folderPath = dirname(filePath);

  const titleRaw = (lines[0] ?? "").replace(/^#\s+/, "");
  const title = cleanTitle(titleRaw);

  const bodyLines = lines.slice(1);

  // Find first numbered question (e.g. "1. text")
  const firstQIdx = bodyLines.findIndex((l) => /^\d+\.\s/.test(l));

  // Find the nearest bold heading immediately before the first question
  let firstHeadingIdx = -1;
  if (firstQIdx > 0) {
    for (let i = firstQIdx - 1; i >= 0; i--) {
      if (bodyLines[i].trim() === "") continue;
      if (isBoldHeading(bodyLines[i])) firstHeadingIdx = i;
      break;
    }
  }

  const introEndIdx = firstHeadingIdx >= 0
    ? firstHeadingIdx
    : firstQIdx >= 0
    ? firstQIdx
    : bodyLines.length;

  const introContent = bodyLines.slice(0, introEndIdx).join("\n").trim() || undefined;

  const parseStartIdx = firstHeadingIdx >= 0
    ? firstHeadingIdx
    : firstQIdx >= 0
    ? firstQIdx
    : bodyLines.length;

  const parseLines = bodyLines.slice(parseStartIdx);

  const sections: Array<{ heading?: string; questions: ParsedQuestion[] }> = [];
  let currentSection: { heading?: string; questions: ParsedQuestion[] } | null = null;
  let currentQuestion: { textLines: string[]; linkPaths: string[] } | null = null;

  const finalizeQuestion = async (): Promise<void> => {
    if (!currentQuestion || !currentSection) return;
    const text = normalizeSpaces(currentQuestion.textLines.join("\n").trimEnd());
    const answerMarkdowns: string[] = [];
    for (const linkPath of currentQuestion.linkPaths) {
      const md = await readSubpageContent(folderPath, linkPath);
      if (md !== null) answerMarkdowns.push(md);
    }
    currentSection.questions.push({ text, answerMarkdowns });
    currentQuestion = null;
  };

  for (const line of parseLines) {
    const qMatch = line.match(/^\d+\.\s+([\s\S]+)/);

    if (isBoldHeading(line)) {
      await finalizeQuestion();
      currentSection = { heading: extractHeadingText(line), questions: [] };
      sections.push(currentSection);
    } else if (qMatch) {
      await finalizeQuestion();
      if (!currentSection) {
        currentSection = { heading: undefined, questions: [] };
        sections.push(currentSection);
      }
      currentQuestion = { textLines: [qMatch[1]], linkPaths: [] };
    } else {
      const linkPath = extractSubpageLinkPath(line);
      if (linkPath && currentQuestion) {
        currentQuestion.linkPaths.push(linkPath);
      } else if (currentQuestion && currentQuestion.linkPaths.length === 0) {
        currentQuestion.textLines.push(line);
      }
    }
  }

  await finalizeQuestion();

  return { title, introContent, sections: sections as readonly ParsedSection[] };
}

export async function parseExportFolder(folderPath: string): Promise<ParsedPage[]> {
  const pages: ParsedPage[] = [];
  for await (const entry of Deno.readDir(folderPath)) {
    if (entry.isFile && entry.name.startsWith("+") && entry.name.endsWith(".md")) {
      pages.push(await parseParentPage(join(folderPath, entry.name)));
    }
  }
  pages.sort((a, b) => a.title.localeCompare(b.title));
  return pages;
}
