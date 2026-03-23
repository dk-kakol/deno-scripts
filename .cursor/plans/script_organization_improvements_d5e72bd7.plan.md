---
name: Script Organization Improvements
overview: "Improve the project's script organization conventions: extract types, add per-script READMEs, introduce mod.ts barrel exports for cross-script imports, reorganize shared/ with subfolders and an import map alias, and update the skill + README documentation to codify these conventions."
todos:
  - id: shared-reorg
    content: Reorganize shared/ into subfolders (shared/env/) with barrel exports (mod.ts) and add @shared import map alias to deno.json
    status: pending
  - id: notion-refactor
    content: Split first-notion-integration/create_page.ts into types.ts + constants.ts (root) + features/blocks.ts, features/create_page.ts; fix test mismatch; add mod.ts and README.md
    status: pending
  - id: openai-update
    content: Move chat.ts and chat_test.ts into features/; add mod.ts and README.md to openai-chat; update main.ts to use @shared
    status: pending
  - id: update-skill
    content: Update add-script SKILL.md with new conventions (README, types.ts, mod.ts, @shared, multi-module guidance)
    status: pending
  - id: update-readme
    content: Update project README.md with new structure, conventions, and available tasks
    status: pending
  - id: update-cleancode
    content: Update clean-code SKILL.md to reference @shared and mod.ts patterns
    status: pending
  - id: verify
    content: Run deno task check and deno task test to verify everything works
    status: pending
isProject: false
---

# Script Organization Improvements

## Current State

- **openai-chat**: Clean 3-file structure (`main.ts`, `chat.ts`, `chat_test.ts`), no custom types
- **first-notion-integration**: 3 files but `create_page.ts` is 167 lines with 5 inline type definitions, a default template constant, 3 private helpers, and 2 exported functions -- too much in one file
- **shared/**: Only `env.ts` + `env_test.ts`, flat structure, imported via relative paths like `../../shared/env.ts`

## 1. New Script Directory Convention

```
scripts/<name>/
  README.md              # what it does, usage, env vars
  main.ts                # thin entry point (unchanged)
  mod.ts                 # barrel export for cross-script imports
  types.ts               # types/interfaces (when the script defines any)
  constants.ts           # exported constants (when the script defines any)
  features/              # logic modules grouped here
    <feature>.ts
    <feature>_test.ts    # tests live next to the logic they test
  input/.gitkeep         # if applicable
  output/.gitkeep        # if applicable
```

Key additions:

- `**README.md**`: Every script gets one. Template: purpose, usage (`deno task <name>` + Docker), env vars, example output
- `**types.ts**`: Stays at script root (shared across all features). Only created when the script defines its own interfaces/type aliases. Not needed for scripts that only use SDK types (like openai-chat)
- `**constants.ts**`: Stays at script root. Extract any exported constants here (defaults, config values, templates). Only created when the script has constants worth extracting
- `**features/**`: All logic modules and their tests go here. Even simple scripts use this folder for consistency, so the convention is uniform and there's a clear place to add more modules as scripts grow
- `**mod.ts**`: Re-exports the script's public API so other scripts can `import { fn } from "../other-script/mod.ts"`

## 2. Reorganize `shared/` with Subfolders and Import Map

### New structure

```
shared/
  mod.ts                 # barrel: export { getEnv } from "./env/env.ts"
  env/
    env.ts               # (unchanged)
    env_test.ts          # (unchanged)
```

No `mod.ts` inside subfolders -- it would just duplicate the module file. The top-level `shared/mod.ts` imports directly from each submodule.

### Import map alias in [deno.json](deno.json)

Add `"@shared": "./shared/mod.ts"` to the imports map. Scripts then import:

```typescript
import { getEnv } from "@shared";
```

instead of the fragile relative path `../../shared/env.ts`. This scales cleanly as more utilities are added to `shared/`.

## 3. Refactor first-notion-integration

Split the 167-line [create_page.ts](scripts/first-notion-integration/create_page.ts) into focused modules:

- `**types.ts**` (script root) -- `BlockObjectRequest`, `NestedBlockObjectRequest`, `Question`, `Section`, `PageTemplate`
- `**constants.ts**` (script root) -- `DEFAULT_TEMPLATE` constant
- `**features/blocks.ts**` -- `buildHeadingBlock`, `buildToggleBlock`, `buildQuestionBlock` (private), `buildBlocks` (exported)
- `**features/blocks_test.ts**` -- tests for `buildBlocks` (moved from create_page_test.ts)
- `**features/create_page.ts**` -- only `createNotionPage` (imports `buildBlocks` from `blocks.ts`)
- `**features/create_page_test.ts**` -- tests for `createNotionPage` only
- `**mod.ts**` -- re-exports public API: `createNotionPage`, `buildBlocks`, types, `DEFAULT_TEMPLATE`
- `**README.md**` -- purpose, usage, env vars (`NOTION_API_KEY`, `NOTION_PAGE_ID`)
- **Update `main.ts`** -- use `@shared` import, import logic from `./features/`

Also fix the test assertion mismatch noted in `create_page_test.ts` (lines 76-77 assert `"tu markdown content"` but the implementation uses `"tu markdown content 1"` and `"tu markdown content 2"`).

### Resulting structure

```
scripts/first-notion-integration/
  README.md
  main.ts                       # entry point, imports from features/
  mod.ts                        # barrel export for cross-script use
  types.ts                      # shared types (at root, used by all features)
  constants.ts                  # DEFAULT_TEMPLATE constant
  features/
    blocks.ts                   # block building logic
    blocks_test.ts              # tests for buildBlocks
    create_page.ts              # createNotionPage function
    create_page_test.ts         # tests for createNotionPage
```

## 4. Update openai-chat

Move logic into `features/` for consistency with the new convention:

- Add `**README.md**`
- Move `chat.ts` to `**features/chat.ts**`, `chat_test.ts` to `**features/chat_test.ts**`
- Add `**mod.ts**`: `export { chat, parsePrompt } from "./features/chat.ts"`
- Update `main.ts` to use `@shared` import and `./features/chat.ts` import

### Resulting structure

```
scripts/openai-chat/
  README.md
  main.ts
  mod.ts
  features/
    chat.ts
    chat_test.ts
  input/.gitkeep
  output/.gitkeep
```

## 5. Enable Script-to-Script Calling

Each script's `mod.ts` exposes its public API. To call one script from another:

```typescript
import { chat } from "../openai-chat/mod.ts";
```

No import map entries needed for cross-script imports (they'd grow unboundedly). Relative paths via `mod.ts` are sufficient since scripts are siblings under `scripts/`.

## 6. Update Documentation

### [.cursor/skills/add-script/SKILL.md](.cursor/skills/add-script/SKILL.md)

Update the reference implementation and Phase 2-3 to include:

- `README.md` (with template)
- `types.ts` (when the script defines custom types)
- `mod.ts` (barrel export for public API)
- `@shared` import convention
- Guidance on when to split into multiple logic modules

### [README.md](README.md)

- Update "Project Structure" tree to show the new layout
- Update "Adding a New Script" section with the new conventions
- Add `first-notion-integration` to the "Available Tasks" table
- Mention `@shared` import pattern
- Mention cross-script calling via `mod.ts`

### [.cursor/skills/clean-code/SKILL.md](.cursor/skills/clean-code/SKILL.md)

- Update section 5 (`shared/ vs script-local`) to reference `@shared` import and `mod.ts`

## Files Changed Summary

- **New files**: 7 (README.md x2, mod.ts x2, types.ts, features/template.ts, features/blocks.ts for notion script)
- **Split files**: `create_page.ts` splits into `types.ts` + `features/template.ts` + `features/blocks.ts` + `features/create_page.ts`
- **Moved files**: `env.ts` and `env_test.ts` into `shared/env/`; `chat.ts` and `chat_test.ts` into `features/`; notion logic into `features/`
- **New barrel exports**: `shared/mod.ts`, `shared/env/mod.ts`
- **Modified**: `deno.json` (import map), `main.ts` x2 (imports), test files (imports, fix assertions), SKILL.md, README.md, clean-code SKILL.md

