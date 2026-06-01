# EvaLLM

Small local-first bench for evaluating JSON outputs from multiple LLMs on the same prompt cases.

## Stack

- SolidJS
- Vite
- TypeScript
- small Node API server for provider calls

## What it does

- compare several models on the same session or meal prompts
- keep one API key, base URL, and model slug per provider slot
- validate outputs for:
  - valid JSON
  - expected schema shape
- export config and results as JSON

## Supported providers in this first version

- OpenAI-compatible chat completion APIs
  - OpenAI
  - OpenRouter
  - Kimi Code subscription
  - Groq
  - Together
  - similar providers exposing `POST /chat/completions`
- Anthropic
  - Claude via `POST /messages`

## Run locally

```bash
cd EvaLLM
npm install
npm run dev
```

That starts:

- UI on `http://127.0.0.1:3030`
- API on `http://127.0.0.1:3031`

## Notes

- API keys are stored in browser `localStorage` for convenience. This is fine for local eval work, not production secret handling.
- The schema validator is intentionally lightweight. It supports:
  - `type`
  - `required`
  - `properties`
  - `items`
  - `enum`
  - `minItems`
  - `minLength`
- The next logical step is adding repo-specific adapters so you can compare raw model calls against `program-api` generation endpoints.
# EvaLLM
