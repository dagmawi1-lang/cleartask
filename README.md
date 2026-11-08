# ClearTask

**Turn “where do I begin?” into a plan.** ClearTask is a student-focused task planner that converts a student's own description into an editable sequence of small steps, rough time estimates, and a progress checklist.

## My role & contributions

**Solo developer · AI-assisted**

- Designed the step-by-step planning flow and the template planner used when AI is off

## Current status

Version 1.0.1 is a pre-event baseline prototype created before Global AI Builder's Challenge begins. The event runs November 21–28, 2026. The official rules allow new projects and meaningful improvements to existing projects, but require teams to disclose existing work and identify the improvements completed during the event. This repository therefore records the current baseline; event-period changes must be separately documented in the changelog and submission.

## What works

- Create a starter plan for a school assignment or everyday task.
- Optionally use a server-side AI planner when an operator configures an API key; validate its output and fall back to local templates if the service is unavailable.
- Set an optional target date and available work time.
- Edit step titles and details.
- Mark steps complete and track progress.
- Save the current plan in browser local storage.
- Export the plan as a Markdown checklist.
- Use the core planner without an account, API key, or external AI service.

## Important limitation

The deterministic fallback uses transparent templates and does not interpret the full meaning of the task. An optional AI route is implemented, but a live provider call has not been verified in this workspace because no API key is configured. All suggested steps are drafts that the student should review and edit. It does not write or complete graded assignments.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run server  # in a second terminal
npm run dev
```

Open the local URL printed by Vite.

## Verify

```bash
npm run check
npm run build
```

`npm run check` validates the app's named imports and runs the pure planner tests. The production build still needs a fresh dependency installation on the target machine.

## Tech stack

- React 19
- Vite 8
- JavaScript ES modules
- Plain CSS
- Lucide React icons
- Node.js built-in test runner

## Privacy

The prototype stores the plan in the current browser's local storage and does not create accounts. Without an AI key, task text stays local. If an operator configures an AI key and the AI path is used, task text is sent to that configured provider. Do not enter private or sensitive information into a public demo.

## Third-party resources and optional AI endpoint

- An optional AI endpoint can call a configured OpenAI-compatible chat-completions provider. The API key remains on the server and is never placed in browser code. The live provider path must be tested by the operator with their own key before claiming it works in a demo.
- React, Vite, and Lucide React are third-party open-source dependencies; see their respective licenses.
- No external datasets or user analytics are used.

## License

**Permission required.** © 2026 Dagmawi Melaku. You need my written permission before using, copying, or modifying this code, and any approved use must credit me with a link to this repository. Viewing, forking on GitHub, and running it to judge or review a submission are allowed without asking. To ask, [open an issue](../../issues/new). See [LICENSE](LICENSE) for the full terms.
