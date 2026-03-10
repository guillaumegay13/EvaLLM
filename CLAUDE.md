# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EvaLLM is a local-first benchmark app for evaluating JSON outputs from multiple LLMs on the same prompt cases. It compares models across providers (OpenAI, Anthropic, OpenRouter, Groq, Together, etc.) with JSON schema validation and quality scoring.

## Commands

```bash
npm run dev          # Start UI (port 3030) + API (port 3031) concurrently
npm run dev:ui       # Vite dev server only (port 3030)
npm run dev:api      # API server with --watch (port 3031)
npm run build        # Production build to dist/
```

There are no tests or linting configured.

## Architecture

### Two-process setup

- **Frontend**: SolidJS + TypeScript SPA served by Vite on port 3030. Routes are defined in `src/index.tsx`.
- **Backend**: Standalone Node.js HTTP server (`server.mjs`) on port 3031. No framework — uses `node:http` directly. Vite proxies `/api` requests to the backend in dev.

### API endpoints (server.mjs)

- `POST /api/evaluate` — Runs batch evaluation: sends each prompt to each model in parallel via `Promise.all`, parses JSON from responses, validates against schema, computes quality score (0-100).
- `POST /api/list-models` — Fetches available models from a provider's API.
- `GET /api/health` — Health check.

### State management (src/lib/store.tsx)

All app state lives in a single SolidJS Store exposed via context (`AppStoreProvider` / `useAppStore()`). The store holds `ConfigState` (settings, providers, models, promptCases) and derived signals (batch results, running status).

State is persisted to `localStorage` under keys `evallm-config-v1` and `evallm-batch-v1`, with auto-save via `createEffect`. Includes migration logic from a legacy flat model format.

### Provider abstraction

Models reference providers via `providerId`. When running evaluations, models are "hydrated" — flattened into `HydratedModel` objects that merge model config with provider credentials. The server dispatches to provider-specific runners (`runOpenAiCompatible` or `runAnthropic`) based on `model.provider`.

### JSON evaluation pipeline (server.mjs)

1. Build prompt envelope (system prompt + strict JSON instructions + schema shape)
2. Call provider API
3. Extract JSON candidate from response (handles markdown fences, balanced brace extraction)
4. Parse and validate against user-provided JSON Schema (lightweight validator supporting `type`, `required`, `properties`, `items`, `enum`, `minItems`, `minLength`)
5. Compute score: 10pts output present + 45pts valid JSON + up to 45pts schema compliance

### Key types (src/lib/types.ts)

- `Provider`: `"openai-compatible" | "anthropic"`
- `JsonMode`: `"native" | "prompt-only"` — native uses `response_format: { type: "json_object" }`, prompt-only relies on system prompt instructions
- `ConfigState`: top-level state shape containing `EvalSettings`, `ProviderConfig[]`, `EvalModel[]`, `PromptCase[]`

## Styling

Dark theme using CSS custom properties defined in `src/styles/theme.css`. Layout grid in `src/styles/layout.css`. Fonts: DM Sans (body) + JetBrains Mono (code). No CSS preprocessor.
