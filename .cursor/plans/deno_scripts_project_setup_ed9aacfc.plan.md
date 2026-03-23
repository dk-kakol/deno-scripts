---
name: Deno Scripts Project Setup
overview: Set up a Dockerized Deno 2.x scripts project with proper structure, configuration, environment management, an OpenAI chat completion script using the Vercel AI SDK, unit tests, CI, and pre-commit hooks.
todos:
  - id: gitignore
    content: Create `.gitignore` (ignore .env, node_modules, output contents, OS files, IDE folders)
    status: pending
  - id: dockerignore
    content: Create `.dockerignore` (ignore .git, node_modules, .env)
    status: pending
  - id: deno-json
    content: Create `deno.json` with tasks, imports, fmt/lint config, node_modules exclude
    status: pending
  - id: env-files
    content: Create `.env.example` (committed) and `.env` (git-ignored) with OPENAI_API_KEY
    status: pending
  - id: shared-env
    content: Create `shared/env.ts` -- env validation helper (getEnv with clear error messages)
    status: pending
  - id: shared-env-test
    content: Create `shared/env_test.ts` -- unit tests for env helper
    status: pending
  - id: example-script
    content: Create `scripts/openai-chat/` folder with main.ts, chat.ts, input/, output/ (.gitkeep)
    status: pending
  - id: example-script-test
    content: Create `scripts/openai-chat/chat_test.ts` -- unit tests for chat logic
    status: pending
  - id: dockerfile
    content: Create `Dockerfile` based on denoland/deno:2
    status: pending
  - id: docker-compose
    content: Create `docker-compose.yml` with env and volume mounting
    status: pending
  - id: githooks
    content: Create `.githooks/pre-commit` running fmt --check, lint, check, test
    status: pending
  - id: github-actions
    content: Create `.github/workflows/ci.yml` with same checks + dependency caching
    status: pending
  - id: vscode-settings
    content: Create `.vscode/settings.json` with `deno.enable` for LSP support in Cursor/VS Code
    status: pending
  - id: cursor-rules
    content: Create `.cursor/rules/deno.mdc` with Deno-specific AI guidance for Cursor
    status: pending
  - id: readme
    content: Create `README.md` with setup, usage, and structure docs
    status: pending
isProject: false
---

# Deno Scripts Project Setup

## Directory Structure

```
deno-scripts/
├── .github/
│   └── workflows/
│       └── ci.yml                  # GitHub Actions: fmt, lint, typecheck, test
├── .githooks/
│   └── pre-commit                  # Pre-commit hook: same checks as CI
├── scripts/
│   └── openai-chat/
│       ├── main.ts                 # Entry point (CLI arg parsing, runs chat)
│       ├── chat.ts                 # Pure logic: build messages, call AI SDK
│       ├── chat_test.ts            # Unit tests for chat.ts
│       ├── input/
│       │   └── .gitkeep
│       └── output/
│           └── .gitkeep
├── shared/
│   ├── env.ts                      # Shared helper to validate env vars
│   └── env_test.ts                 # Unit tests for env.ts
├── deno.json                       # Deno config: tasks, imports, fmt, lint
├── Dockerfile                      # Multi-purpose Deno 2.x image
├── .dockerignore                   # Keep .git, .env, node_modules out of image
├── docker-compose.yml              # Easy script running with env/volume mounts
├── .env.example                    # Template showing required env vars (committed)
├── .env                            # Actual secrets (git-ignored)
├── .vscode/
│   └── settings.json               # Enable Deno LSP for VS Code / Cursor
├── .cursor/
│   └── rules/
│       └── deno.mdc                # Deno AI guidance for Cursor assistant
├── .gitignore                      # Ignore .env, node_modules, output/*, OS files
└── README.md                       # Usage docs
```

## Files to Create

### 1. `.gitignore`

- `.env*` with `!.env.example` -- ignore all env files (`.env`, `.env.local`, `.env.production`, etc.) except the committed template
- `node_modules/` -- created by Deno's `nodeModulesDir: "auto"` for npm packages
- `scripts/*/output/*` with `!scripts/*/output/.gitkeep` -- ignore generated outputs but keep the empty dirs
- OS artifacts: `.DS_Store`, `Thumbs.db`
- IDE folders: `.idea/` (but **not** `.vscode/` -- we commit `settings.json` for Deno LSP)
- `deno.lock` is **tracked** for reproducible builds

### 2. `.dockerignore`

Prevents copying unnecessary/sensitive files into the Docker build context:

```
.git
.env*
!.env.example
node_modules
scripts/*/output/*
```

### 3. `.env.example` and `.env`

- `.env.example` -- committed to repo, shows which variables are needed:

```
OPENAI_API_KEY=sk-your-key-here
```

- `.env` -- actual secrets, git-ignored. Created by copying `.env.example`.
- Loaded automatically by Deno's built-in `--env-file` flag (no `@std/dotenv` library needed).
- The Vercel AI SDK then reads `OPENAI_API_KEY` from `Deno.env`.

### 4. `deno.json` (Deno configuration)

- **tasks**:
  - `"chat": "deno run --env-file --allow-net --allow-env scripts/openai-chat/main.ts"` -- run the chat script
  - `"test": "deno test --allow-env"` -- run all tests
  - `"fmt": "deno fmt"` -- auto-fix formatting
  - `"check": "deno fmt --check && deno lint && deno check scripts/ shared/"` -- all quality checks
  - `"setup-hooks": "git config core.hooksPath .githooks"` -- one-time hook setup
- **imports**:
  - `@std/assert` -- test assertions
  - `ai` -- Vercel AI SDK core (`npm:ai`)
  - `@ai-sdk/openai` -- OpenAI provider (`npm:@ai-sdk/openai`)
- **exclude**: `["node_modules/"]` -- prevent fmt/lint from processing npm deps
- **nodeModulesDir**: `"auto"` for npm compatibility

### 5. `shared/env.ts` (shared env helper)

A small validation utility (no file-loading needed -- the `--env-file` flag handles that). Exports:

- `getEnv(key: string): string` -- reads `Deno.env.get(key)`, throws with a clear message if the variable is missing or empty

### 6. `shared/env_test.ts` (unit tests for env helper)

Tests using Deno's built-in test runner + `@std/assert`:

- `getEnv()` returns the value when the env var is set
- `getEnv()` throws with a descriptive error when the var is missing
- Tests manipulate `Deno.env` directly (no `.env` file needed)

### 7. `scripts/openai-chat/` (OpenAI chat completion)

Split into two files for testability:

`**chat.ts`** -- pure logic, exported functions:

- `parsePrompt(args: string[]): string` -- extracts the user prompt from CLI args, returns a default if none provided
- `chat(prompt: string, model?: LanguageModel): Promise<string>` -- calls `generateText()` from the Vercel AI SDK. The `model` parameter defaults to `openai("gpt-4o-mini")` but can be overridden in tests with a mock (dependency injection)

`**main.ts`** -- entry point, thin orchestrator (env is already loaded by `--env-file` flag):

1. Calls `getEnv("OPENAI_API_KEY")` from `shared/env.ts` to validate the key is present
2. Calls `parsePrompt(Deno.args)` from `chat.ts`
3. Calls `chat(prompt)` from `chat.ts`
4. Prints the result to stdout

Example usage:

```bash
deno task chat
deno task chat "Explain quantum computing in 3 sentences"
```

### 8. `scripts/openai-chat/chat_test.ts` (unit tests for chat script)

Tests for the pure functions in `chat.ts`:

- `parsePrompt([])` returns the default prompt
- `parsePrompt(["Hello"])` returns `"Hello"`
- `parsePrompt(["multiple", "words"])` joins them into one prompt
- `chat()` -- tested by passing a mock `LanguageModel` via the DI parameter, so no real API call or network access is needed

### 9. `Dockerfile`

- Based on `denoland/deno:2` official image
- Copies source, caches dependencies
- Uses `CMD` with a default script, overridable at runtime
- Runs with minimum necessary permissions

### 10. `docker-compose.yml`

- Service `deno` based on the Dockerfile
- Mounts `./scripts` and `./shared` as volumes for live editing
- Loads `.env` file automatically
- Default command runs the example script; easy to override:

```bash
docker compose run deno deno task chat "What is Deno?"
```

### 11. `.githooks/pre-commit` (native git pre-commit hook)

A shell script that runs four checks before each commit. Uses explicit directory paths instead of `**/*.ts` globs (which don't work in `/bin/sh`):

```bash
#!/bin/sh
set -e
echo "Running pre-commit checks..."
deno fmt --check
deno lint
deno check scripts/ shared/
deno test --allow-env
echo "All checks passed."
```

Developers activate hooks once after cloning:

```bash
deno task setup-hooks
```

### 12. `.github/workflows/ci.yml` (GitHub Actions CI)

Runs on every push and pull request to `master`. Steps:

1. Checkout code
2. Set up Deno via `denoland/setup-deno@v2`
3. Cache `DENO_DIR` for faster subsequent runs
4. Run checks as separate steps (so all failures are visible, not just the first):
  - `deno fmt --check`
  - `deno lint`
  - `deno check scripts/ shared/`
  - `deno test --allow-env`

### 13. `.vscode/settings.json` (editor config)

Enables the Deno language server for anyone opening the project in VS Code or Cursor:

```json
{
  "deno.enable": true,
  "deno.lint": true,
  "deno.unstable": false,
  "[typescript]": {
    "editor.defaultFormatter": "denoland.vscode-deno",
    "editor.formatOnSave": true
  }
}
```

This ensures: IntelliSense for `Deno.*` APIs, proper resolution of import maps from `deno.json`, integrated linting, and format-on-save using `deno fmt`.

### 14. `.cursor/rules/deno.mdc` (AI assistant guidance)

A Cursor rules file based on the official [Deno skills for AI assistants](https://github.com/denoland/skills). It instructs Cursor's AI to:

- Use Deno APIs and `@std/` imports instead of Node.js equivalents
- Follow `deno.json` import maps rather than bare `npm:` specifiers inline
- Use `Deno.test()` for tests, not Jest/Vitest/Mocha
- Respect Deno permissions model (`--allow-net`, `--allow-read`, etc.)
- Prefer the Deno standard library over third-party packages where available

### 15. `README.md`

Documents:

- What this project is
- Prerequisites (Docker, optionally Deno locally)
- Quick start (clone, copy `.env.example`, setup hooks, run)
- How to run scripts (locally with Deno, or via Docker)
- How to add a new script (folder convention, task registration)
- How to run tests (`deno task test`)
- Project structure overview

