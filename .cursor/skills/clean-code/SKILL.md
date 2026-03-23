---
name: clean-code
description: Clean code guidance with concrete examples from this Deno project. Use when the user asks about code quality, refactoring, best practices, or wants to improve existing code.
---

# Clean Code in deno-scripts

Concrete patterns drawn from this codebase. Read `.cursor/rules/clean-code.mdc` for the short checklist; this skill adds depth.

## 1. Thin entry points

`main.ts` validates env, parses args, calls logic, prints output. No business logic.

```typescript
// BAD -- logic mixed into entry point
import { getEnv } from "@shared";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

getEnv("OPENAI_API_KEY");
const prompt = Deno.args.join(" ") || "Say hello";
const { text } = await generateText({
  model: openai("gpt-4o-mini"),
  messages: [{ role: "user", content: prompt }],
});
console.log(text);

// GOOD -- delegates to a testable module
import { getEnv } from "@shared";
import { chat, parsePrompt } from "./features/chat.ts";

getEnv("OPENAI_API_KEY");
const prompt = parsePrompt(Deno.args);
const response = await chat(prompt);
console.log(response);
```

## 2. Dependency injection for testability

Accept external services as parameters with production defaults. Tests swap in mocks without touching the network.

```typescript
// The `model` parameter lets tests inject a mock
export async function chat(
  prompt: string,
  model: LanguageModel = openai("gpt-4o-mini"),
): Promise<string> {
  const { text } = await generateText({
    model,
    messages: [{ role: "user", content: prompt }],
  });
  return text;
}
```

Apply this pattern to any external dependency: HTTP clients, database connections, file system access.

## 3. Descriptive error messages

Errors should tell the user *what* is wrong and *how* to fix it.

```typescript
// BAD
if (!value) throw new Error("missing env");

// GOOD
if (!value) {
  throw new Error(
    `Missing required environment variable: ${key}\n` +
      `Copy .env.example to .env and set a value for ${key}.`,
  );
}
```

## 4. Test structure (arrange-act-assert)

Each test has three clear phases. Name tests with "verb + expected outcome".

```typescript
Deno.test("getEnv throws when the variable is missing", () => {
  // arrange
  Deno.env.delete("TEST_VAR_MISSING");

  // act + assert
  assertThrows(
    () => getEnv("TEST_VAR_MISSING"),
    Error,
    "Missing required environment variable: TEST_VAR_MISSING",
  );
});
```

For async tests with mocks, build the mock in arrange, call the function in act, and check the result in assert:

```typescript
Deno.test("chat returns text from the model", async () => {
  // arrange
  const mockModel = new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: "text", text: "Mocked response" }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 3, text: 3, reasoning: undefined },
      },
      warnings: [],
    }),
  });

  // act
  const result = await chat("test prompt", mockModel);

  // assert
  assertEquals(result, "Mocked response");
});
```

## 5. `shared/` vs script-local modules

| Put it in `shared/` | Keep it in `scripts/<name>/` |
|---|---|
| Used by 2+ scripts | Only relevant to this script |
| General-purpose utility | Domain-specific logic |
| Examples: `env.ts`, path helpers, logging | Examples: `chat.ts`, prompt parsing |

Before creating a new `shared/` module, check if an existing one already covers the need.

### Importing from `shared/`

Always use the `@shared` import map alias — never relative paths:

```typescript
// BAD — fragile relative path that breaks when files move
import { getEnv } from "../../shared/env.ts";

// GOOD — stable alias resolved via deno.json import map
import { getEnv } from "@shared";
```

`@shared` resolves to `shared/mod.ts`, which re-exports everything from the submodules. When adding a new utility to `shared/`, export it from `shared/mod.ts`.

### Exposing a script's public API via `mod.ts`

Each script has a `mod.ts` barrel file that re-exports its public API. This is the only file other scripts should import from:

```typescript
// scripts/first-notion-integration/mod.ts
export { buildBlocks } from "./features/blocks.ts";
export { createNotionPage } from "./features/create_page.ts";
export { DEFAULT_TEMPLATE } from "./constants.ts";
export type { PageTemplate } from "./types.ts";

// Calling from another script:
import { createNotionPage } from "../first-notion-integration/mod.ts";
```

No import map entries are needed for cross-script imports — relative paths via `mod.ts` are sufficient since scripts are siblings under `scripts/`.

## 6. Function size guideline

If a function exceeds ~20 lines, look for extraction opportunities:
- Separate validation from transformation
- Extract helper functions for repeated patterns
- Split "get data" from "format data"

## 7. Naming quick reference

| Element | Convention | Example |
|---|---|---|
| Function returning value | noun / `get*` / `parse*` | `parsePrompt`, `getEnv` |
| Function performing action | verb | `chat`, `sendEmail`, `writeOutput` |
| Boolean | `is*` / `has*` / `can*` | `isValid`, `hasApiKey` |
| Constant | `UPPER_SNAKE_CASE` | `DEFAULT_PROMPT` |
| Type / Interface | `PascalCase` | `ChatOptions`, `LanguageModel` |
