# Changelog

## 2.0.0 - 2026-11-22 (built during the Global AI Builder's Challenge)
- Added browser-side AI engines: Chrome on-device model (Prompt API), Gemini with the user's own key, and any OpenAI-compatible endpoint. Keys stay in session storage for the open tab only.
- Added an AI output validator that clamps times, drops empty steps, and removes steps that try to complete the work for the student, with the count shown in the plan.
- Added a task-specificity check ("X/Y steps refer to details from your description").
- Added AI "questions to check before you start".
- Added "I'm stuck — split this step" with AI and template breakdowns.
- Added a day-by-day schedule with daily time, a buffer day, and a warning when the plan can't fit.
- Added minute editing, custom steps, and step deletion.
- Made the app an installable PWA with offline support and a static GitHub Pages build (no server needed).
- Replaced the icon library with inline icons.
- Added 11 tests (scheduler and AI validator), a browser smoke test, and an evaluation script with 15 cases.

## 1.0.1 - 2026-11-04
- Added an optional server-side AI planning endpoint with server-only API-key handling.
- Added schema validation and a deterministic fallback when no key is configured or the provider fails.
- Added privacy disclosure in the interface and tests for API validation and AI-output normalization.
- Added client-side normalization of persisted and returned plans.

## 1.0.0 - 2026-11-04
- Created a responsive task-planning workspace for school and everyday tasks.
- Added deterministic starter-plan generation, editable steps, time estimates, and progress tracking.
- Added browser-local persistence and Markdown export.
- Added planner validation, date normalization, and automated tests.
