# ClearTask

**Turn "where do I begin?" into a plan.** ClearTask is a task planner for students. Describe an assignment or a multi-step task in your own words, and ClearTask turns it into an editable list of small steps with time estimates and a progress checklist.

Being prepared for the [Global AI Builder's Challenge](https://global-ai-builders-challenge.devpost.com/) (November 21–28, 2026). Versions 1.0.x were built before the event; see the [changelog](CHANGELOG.md).

## My role & contributions

**Solo developer · AI-assisted**

- Designed the step-by-step planning flow and the template planner used when AI is off

## Features

- **Starter plans** for school assignments and everyday tasks, generated from the student's own description.
- **Optional AI planner:** when a provider key is configured on the server, an AI model drafts the steps. Its output is validated, and the app falls back to the template planner if the provider is unavailable.
- **Target date and available time** to shape the plan.
- **Editable steps:** rename steps, change details, and mark steps complete with a progress bar.
- **Export** the plan as a Markdown checklist.
- Plans are saved in the browser. No account is needed.

## Tech stack

React 19 · Vite · JavaScript · CSS · Lucide icons · Node.js (built-in HTTP server and test runner)

## Getting started

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev        # app
npm run server     # planner API (second terminal)
```

Open the local URL printed by Vite. To create a production build, run `npm run build`.

To turn on the AI planner, copy `.env.example` to `.env` and set `AI_API_KEY` (plus `AI_BASE_URL` and `AI_MODEL` if needed). Any OpenAI-compatible chat-completions endpoint works. The key stays on the server and is never sent to the browser.

## Testing

```bash
npm run check   # import checks, syntax checks, and the test suite
```

Tests cover the template planner, date handling, API validation, and normalization of AI output.

## Design notes

- **Plans are drafts.** Every step is editable, and ClearTask helps students organize their work rather than doing the work for them.
- **Privacy.** Without an AI key, task text never leaves the browser. With one, the task description is sent to the configured provider.

## License

**Permission required.** © 2026 Dagmawi Melaku. You need my written permission before using, copying, or modifying this code, and any approved use must credit me with a link to this repository. Viewing, forking on GitHub, and running it to judge or review a submission are allowed without asking. To ask, [open an issue](../../issues/new). See [LICENSE](LICENSE) for the full terms.
