# notion-interview

Converts Notion markdown exports of interview question pages into structured Notion pages with
English/Polish toggle answers.

## Usage

```bash
deno task notion-interview
```

## What it does

1. Scans `input/import-page-from-notion/` for all `+*.md` parent pages
2. Parses each page: title, intro content, sections, questions, and subpage answer links
3. Translates all English answers to Polish via OpenAI (concurrent, rate-limit safe)
4. Creates structured Notion pages under `NOTION_PAGE_ID` with:
   - Section headings (nested using the first-notion-integration pattern)
   - Numbered questions as `numbered_list_item` blocks
   - Three toggles per question: `en` (green), `pl` (red), `more` (default)
   - Full answer markdown inside toggles via `@tryfabric/martian`

## Environment variables

| Variable         | Description                                       |
| ---------------- | ------------------------------------------------- |
| `OPENAI_API_KEY` | OpenAI API key (for GPT-4o-mini translation)      |
| `NOTION_API_KEY` | Notion integration token                          |
| `NOTION_PAGE_ID` | ID of the parent page to create topic pages under |

Set these in a `.env` file at the workspace root.

## Input folder structure

Place Notion markdown exports in `input/import-page-from-notion/`:

```
import-page-from-notion/
  +Topic Name <notion-id>.md        ← parent page (questions)
  +Topic Name/                      ← subpages folder
    Answer Title <notion-id>.md     ← individual answers
```

Parent pages must start with `+`. The script ignores files without the `+` prefix.

## File structure

```
scripts/notion-interview/
  README.md
  main.ts              # entry point
  mod.ts               # orchestration + re-exports
  types.ts             # domain types
  constants.ts         # CONCURRENCY_LIMIT, toggle colors, paths
  features/
    parse_export.ts    # parseExportFolder() → ParsedPage[]
    parse_export_test.ts
    translate.ts       # translatePage() with concurrent worker pool
    translate_test.ts
    blocks.ts          # buildPageBlocks() → BlockObjectRequest[]
    blocks_test.ts
    create_page.ts     # createInterviewPage() with batching
    create_page_test.ts
  input/
    import-page-from-notion/   ← put Notion exports here
    prompty.md                 ← system prompt for translation
  output/              ← reserved for future output artifacts
```

## Translation prompt

The system prompt in `input/prompty.md` instructs the model to translate technical interview answers
to Polish while preserving markdown structure and keeping common English tech terms.
