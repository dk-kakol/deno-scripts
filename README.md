# deno-scripts

A collection of Deno 2.x scripts with a focus on simplicity and reproducibility.
Scripts run locally with Deno or inside Docker — no installation beyond copying `.env`.

## Prerequisites

- [Deno 2.x](https://deno.land/) — for running scripts locally
- [Docker](https://www.docker.com/) — optional, for containerised execution

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url>
cd deno-scripts

# 2. Create your .env from the template
cp .env.example .env
# Edit .env and fill in the required API keys

# 3. Activate pre-commit hooks (once)
deno task setup-hooks

# 4. Run a script
deno task chat
deno task notion-page
```

## Running with Docker

```bash
# Build and run with Docker Compose
docker compose run deno

# Pass a custom prompt
docker compose run deno deno task chat "What is Deno?"
```

## Available Tasks

| Task | Description |
|------|-------------|
| `deno task chat` | Send a prompt to OpenAI and print the response |
| `deno task notion-page` | Create a structured Notion page from a template |
| `deno task test` | Run all tests |
| `deno task fmt` | Auto-format all TypeScript files |
| `deno task check` | Run fmt check + lint + typecheck |
| `deno task setup-hooks` | Activate pre-commit hooks (run once after cloning) |

## Project Structure

```
deno-scripts/
├── .github/workflows/ci.yml     # CI: fmt, lint, typecheck, test
├── .githooks/pre-commit          # Pre-commit hook (same as CI)
├── scripts/
│   ├── openai-chat/
│   │   ├── README.md             # Purpose, usage, env vars
│   │   ├── main.ts               # Entry point
│   │   ├── mod.ts                # Barrel export for cross-script use
│   │   ├── features/
│   │   │   ├── chat.ts           # Pure logic (testable)
│   │   │   └── chat_test.ts      # Unit tests
│   │   ├── input/                # Put input files here
│   │   └── output/               # Generated output lands here
│   └── first-notion-integration/
│       ├── README.md
│       ├── main.ts
│       ├── mod.ts
│       ├── types.ts              # Custom interfaces
│       ├── constants.ts          # DEFAULT_TEMPLATE
│       └── features/
│           ├── blocks.ts
│           ├── blocks_test.ts
│           ├── create_page.ts
│           └── create_page_test.ts
├── shared/
│   ├── mod.ts                    # Barrel: export { getEnv }
│   └── env/
│       ├── env.ts                # Env variable validation helper
│       └── env_test.ts           # Tests for env helper
├── deno.json                     # Tasks, import map, fmt/lint config
├── Dockerfile                    # Deno 2.x image
├── docker-compose.yml            # Compose service with env + volume mounts
├── .env.example                  # Template for required env vars
└── .vscode/settings.json         # Deno LSP for VS Code / Cursor
```

## Adding a New Script

1. Create a folder under `scripts/`, e.g. `scripts/my-script/`
2. Add `README.md`, `main.ts`, `mod.ts`, and a `features/` subfolder with logic modules and tests
3. Optionally add `types.ts` (custom interfaces) and `constants.ts` (exported constants) at the script root
4. Import shared utilities using the `@shared` alias:
   ```typescript
   import { getEnv } from "@shared";
   ```
5. Add a task in `deno.json`:
   ```json
   "my-script": "deno run --env-file --allow-net --allow-env scripts/my-script/main.ts"
   ```
6. Create `input/` and `output/` subdirectories with `.gitkeep` files if needed

See the `add-script` skill (`.cursor/skills/add-script/SKILL.md`) for the full guided workflow.

## Cross-Script Calling

Each script exposes its public API via `mod.ts`. To call one script from another:

```typescript
import { chat } from "../openai-chat/mod.ts";
import { createNotionPage } from "../first-notion-integration/mod.ts";
```

## Running Tests

```bash
deno task test
```

Tests use `Deno.test()` and `@std/assert`. External service calls (like OpenAI) are
replaced with mock models via dependency injection — no real API key needed for tests.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key (`sk-...`) |
| `NOTION_API_KEY` | Notion integration token (`secret_...`) |
| `NOTION_PAGE_ID` | ID of the parent Notion page |

Copy `.env.example` to `.env` and fill in the values. The `.env` file is git-ignored.
Deno loads it automatically via the `--env-file` flag used in all tasks.
