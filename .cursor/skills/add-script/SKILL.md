---
name: add-script
description: Scaffold a new Deno script with the project's folder conventions, tests, and task registration. Use when the user asks to add a script, create a script, scaffold a script, or add a new command to the project.
---

# Add a New Script

## Reference implementation

Study `scripts/openai-chat/` before generating any files -- it is the canonical example:

```
scripts/openai-chat/
├── README.md        # purpose, usage, env vars, example output
├── main.ts          # thin entry point (env validation + orchestration)
├── mod.ts           # barrel export: re-exports public API for cross-script use
├── features/
│   ├── chat.ts          # pure logic with DI parameters for testability
│   └── chat_test.ts     # unit tests using MockLanguageModelV1
├── input/.gitkeep
└── output/.gitkeep
```

For a script with custom types and constants, study `scripts/first-notion-integration/`:

```
scripts/first-notion-integration/
├── README.md
├── main.ts
├── mod.ts
├── types.ts         # custom interfaces/types (only when the script defines its own)
├── constants.ts     # exported constants (only when the script has constants to extract)
└── features/
    ├── blocks.ts
    ├── blocks_test.ts
    ├── create_page.ts
    └── create_page_test.ts
```

Read the relevant files before writing code to absorb the patterns.

## Workflow

### Phase 1 -- Gather requirements

Ask the user (use AskQuestion when available):

1. **Purpose**: What does the script do? (one sentence)
2. **External services**: APIs, databases, file I/O?
3. **Environment variables**: Any secrets or config needed?
4. **Deno permissions**: Which of `--allow-net`, `--allow-env`, `--allow-read`, `--allow-write` are needed?
5. **I/O folders**: Does the script need `input/` and/or `output/` directories?
6. **Custom types**: Does the script define its own interfaces/types, or only use SDK types?

If the conversation already answered these, skip redundant questions.

### Phase 2 -- Plan the structure

Before writing any code, present the planned file tree to the user for confirmation:

```
scripts/<name>/
├── README.md
├── main.ts
├── mod.ts
├── types.ts              # only if the script defines custom types
├── constants.ts          # only if the script has exported constants
├── features/
│   ├── <logic>.ts
│   └── <logic>_test.ts
├── input/.gitkeep        # if applicable
└── output/.gitkeep       # if applicable
```

List the task definition and permissions that will go into `deno.json`.

### Phase 3 -- Scaffold files (in order)

1. **`scripts/<name>/README.md`**:
   - Purpose (one sentence)
   - Usage section: `deno task <name>` + Docker command
   - Environment Variables table (if any)
   - Example output
   - Structure tree

2. **`scripts/<name>/types.ts`** (only when the script defines custom interfaces/type aliases):
   - Export all types and interfaces used across the script
   - Use `readonly` for data that should not be mutated
   - Skip this file if the script only uses SDK types

3. **`scripts/<name>/constants.ts`** (only when the script has constants worth extracting):
   - Export named constants (`UPPER_SNAKE_CASE`)
   - Import types from `./types.ts` as needed
   - Skip this file for scripts with no standalone constants

4. **`scripts/<name>/features/<logic>.ts`** -- logic module(s):
   - Import types from `../types.ts` and constants from `../constants.ts`
   - Export pure functions
   - Accept external dependencies (API clients, models) as parameters with sensible defaults (dependency injection)
   - Keep functions small and focused

5. **`scripts/<name>/features/<logic>_test.ts`** -- tests:
   - Use `Deno.test()` + `assertEquals` / `assertThrows` from `@std/assert`
   - Mock external services via DI parameters -- no real network calls
   - Follow arrange-act-assert structure

6. **`scripts/<name>/mod.ts`** -- barrel export:
   - Re-export the script's public API: functions, types, constants
   - Allows other scripts to `import { fn } from "../<name>/mod.ts"`

7. **`scripts/<name>/main.ts`** -- thin entry point:
   - Import `getEnv` from `@shared` (not a relative path)
   - Parse CLI args if needed
   - Call the logic module from `./features/`
   - Print output to stdout
   - No business logic here

8. **I/O directories** (if applicable):
   - Create `input/.gitkeep` and/or `output/.gitkeep`

### Phase 4 -- Register and configure

1. **`deno.json` task**: Add a task with minimal permissions:
   ```
   "<name>": "deno run --env-file --allow-net --allow-env scripts/<name>/main.ts"
   ```
   Only include permissions the script actually needs.

2. **`deno.json` imports**: Add any new packages to the import map. Use `npm:<pkg>` or `jsr:<pkg>` specifiers in the map -- never inline in source files.

3. **`.env.example`**: Append any new env var keys with placeholder values.

### Phase 5 -- Verify

Run these commands and fix any issues:

```bash
deno task check    # fmt --check + lint + typecheck
deno task test     # all tests pass
```

## Import conventions

- Use `@shared` to import from the shared utilities barrel:
  ```typescript
  import { getEnv } from "@shared";
  ```
- Use relative paths for cross-script imports via `mod.ts`:
  ```typescript
  import { chat } from "../openai-chat/mod.ts";
  ```
- Never use `../../shared/env.ts` style relative paths to shared utilities.

## Rules

- Follow conventions from `.cursor/rules/deno.mdc` (import maps, `Deno.test`, permissions, etc.)
- Never put business logic in `main.ts`
- Every exported function in a logic module must have a corresponding test
- Use descriptive error messages that guide the user (see `shared/env/env.ts` for the pattern)
- `types.ts` and `constants.ts` are optional -- only create them when the script actually needs them
- All logic modules and tests go inside `features/` -- even for simple single-module scripts
