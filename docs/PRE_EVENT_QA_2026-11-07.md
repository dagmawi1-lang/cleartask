# ClearTask pre-event QA — November 7, 2026

**No application code was changed.** The event (Nov 21–28) requires new work to happen during the event window, so this pass only verifies the 1.0.1 baseline.

| Check | Result |
|---|---|
| `node --test` | 14/14 pass |
| Frontend bundle (esbuild, same sources as Vite) | Builds with 0 errors / 0 warnings |
| Headless Chrome: describe a task → 8-step plan (local fallback), mark a step done (progress 13%), reload (plan persists), too-short input shows a validation message, 390px mobile layout | Pass, no JavaScript errors (only a missing favicon 404) |

## Still unverified (do these on your computer before Nov 21)
- `npm install && npm run build` with real Vite.
- A real AI provider call: put a key in `.env`, run `npm run server` with `npm run dev`, and confirm the plan source says AI.

## Good event-period candidates (Nov 21–28 only)
1. Clarifying questions before planning (the backlog already has this).
2. A small documented comparison of AI plans vs. the template plans.
3. Add a favicon and app manifest (trivial, but do it during the event and log it).
4. A "split this step" control and a due-date-aware schedule view.

Log each change in `docs/EVENT_BASELINE.md` with its date and test evidence.
