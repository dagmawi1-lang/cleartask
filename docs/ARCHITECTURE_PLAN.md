# Architecture plan — Global AI Builder’s Challenge — ClearTask

## Suggested stack
- React + Vite for a fast, accessible web interface.
- Plain CSS with design tokens and responsive breakpoints.
- Node.js built-in HTTP server only if a backend is needed.
- Local-first storage for demo state; no account system unless required.
- Node built-in test runner for logic tests.

## Suggested structure
```text
src/
  components/
  features/
  data/
  lib/
  styles/
server/
tests/
docs/
```

## Engineering standards
- Keep secrets in environment variables; commit only `.env.example`.
- Validate inputs on both client and server.
- Do not collect sensitive personal data.
- Label generated, simulated, and sample content.
- Add tests for the main scoring/decision logic.
