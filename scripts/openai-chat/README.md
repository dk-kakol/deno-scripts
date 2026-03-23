# openai-chat

Sends a prompt to an OpenAI language model and prints the response to stdout.

## Usage

```bash
# Use the default prompt
deno task chat

# Pass a custom prompt
deno task chat "Explain quantum computing in 3 sentences"

# With Docker
docker compose run deno deno task chat "What is Deno?"
```

## Environment Variables

| Variable         | Description                    |
| ---------------- | ------------------------------ |
| `OPENAI_API_KEY` | Your OpenAI API key (`sk-...`) |

Copy `.env.example` to `.env` and set the value.

## Example Output

```
Prompt: Explain quantum computing in 3 sentences

Quantum computing leverages quantum mechanical phenomena...
```

## Structure

```
scripts/openai-chat/
  README.md
  main.ts          # entry point — env validation, arg parsing, calls chat
  mod.ts           # barrel export for cross-script use
  features/
    chat.ts            # parsePrompt + chat — pure logic with DI for testability
    chat_test.ts       # unit tests using MockLanguageModelV1 (no real API calls)
  input/           # put input files here
  output/          # generated output lands here
```
