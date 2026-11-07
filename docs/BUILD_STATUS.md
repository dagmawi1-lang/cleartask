# Build status — ClearTask 1.0.1

## Completed
- Responsive React workspace for school and everyday task planning.
- Deterministic task-plan fallback, editable steps, time estimates, completion tracking, browser persistence, and Markdown export.
- Optional server-side OpenAI-compatible planner endpoint. API keys stay on the server; output is bounded and malformed/failed responses fall back to the local template.
- Static planner-export and icon verification.
- Automated tests: **14/14 passing**, including mocked AI success and failure cases.
- Live local HTTP test: valid request returned a template plan; invalid short input returned HTTP 400.

## Not yet verified
- No real AI provider key was configured, so a live provider request has not been tested.
- Vite production build is blocked in this Linux workspace because the reused dependency tree contains only the Windows Rolldown native binding. The package registry request timed out, so the Linux optional dependency could not be installed.
- Browser interaction, responsive behavior, keyboard navigation, and screen-reader QA remain to be performed after a fresh dependency install.

## Reproduce
```bash
npm install
npm run check
npm run server  # terminal 1
npm run dev     # terminal 2
npm run build
```

Use Node.js 20.19+ or 22+. Keep `.env` private and never commit a real API key.
