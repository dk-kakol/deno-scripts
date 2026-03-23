# first-notion-integration

Creates a structured Notion page from a configurable template. The page contains sections with
numbered questions, each with toggle blocks for English/Polish answers and a link placeholder.

## Usage

```bash
# Create a page with the default title ("Obszar")
deno task notion-page

# Create a page with a custom title
deno task notion-page "My Custom Title"

# With Docker
docker compose run deno deno task notion-page "My Custom Title"
```

## Environment Variables

| Variable         | Description                             |
| ---------------- | --------------------------------------- |
| `NOTION_API_KEY` | Notion integration token (`secret_...`) |
| `NOTION_PAGE_ID` | ID of the parent Notion page            |

Copy `.env.example` to `.env` and set both values.

## Example Output

```
https://www.notion.so/My-Custom-Title-<page-id>
```

## Structure

```
scripts/first-notion-integration/
  README.md
  main.ts          # entry point — env validation, arg parsing, calls createNotionPage
  mod.ts           # barrel export for cross-script use
  types.ts         # BlockObjectRequest, Question, Section, PageTemplate
  constants.ts     # DEFAULT_TEMPLATE
  features/
    blocks.ts          # buildBlocks — builds the block tree from a PageTemplate
    blocks_test.ts     # tests for buildBlocks
    create_page.ts     # createNotionPage — calls the Notion API
    create_page_test.ts
```
