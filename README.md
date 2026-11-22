# ClearTask

**Turn "where do I begin?" into a plan.** ClearTask is a free planner for students. Describe an assignment or any multi-step task in your own words. ClearTask's AI turns it into specific, editable steps, splits any step you're stuck on into tiny actions, and fits the work into the days before your due date.

**Try it:** https://dagmawi1-lang.github.io/cleartask/ (works offline and can be installed as an app)

Built for the [Global AI Builder's Challenge](https://global-ai-builders-challenge.devpost.com/) (November 21–28, 2026).

## What was built during the event

Version 1.0.x (Nov 4, before the event) was a template planner plus an optional server-side AI endpoint that only worked if someone ran their own server with a key. Nobody visiting a website could actually use the AI. **Version 2.0 (built Nov 22, during the event)** makes AI usable by anyone with no server:

| Area | 1.0 (before event) | 2.0 (during event) |
|---|---|---|
| AI engines | Server-only, needs operator key | **On-device AI** in Chrome (private, nothing leaves the computer), **your own Gemini key**, or any **OpenAI-compatible** key, all called straight from the browser |
| AI output safety | Basic shape check | Validator that clamps times, drops empty steps, and **removes steps that try to do the work for the student** (e.g. "here is your essay"), with a visible count |
| Plan quality signal | none | "**X/Y steps refer to details from your description**" so students can see whether the plan is really about their task |
| Unclear instructions | none | AI lists up to 3 **questions to check with the teacher** instead of guessing |
| Stuck on a step | none | **"I'm stuck — split this step"**: AI breaks it into 5–15 minute actions (template fallback if AI is off) |
| Scheduling | Target date shown only | **Day-by-day schedule** that fits unfinished steps into your daily time, keeps a buffer day, and warns when the plan can't fit |
| Editing | Rename / check off | Also edit minutes, add your own steps, delete steps |
| App | Web page | **Installable PWA** with offline support; static site on GitHub Pages |
| Tests | 9 | 20 unit tests + browser smoke test + evaluation script |

See [CHANGELOG.md](CHANGELOG.md) for the full list.

## How the AI works

1. The student's description, task type, date, and time budget go into a short prompt ([`src/lib/ai.js`](src/lib/ai.js)). The system prompt forbids writing, solving, or completing graded work.
2. The model must return JSON (`steps`, `questions`, `note`). ClearTask pulls JSON out even if the model wraps it in chat text.
3. `validateAiSteps` cleans the reply: times are rounded and clamped, empty steps are dropped, and steps that contain finished work ("the answer is…", "here is your essay…") are removed. If fewer than 3 usable steps remain, ClearTask falls back to its template and says so.
4. ClearTask measures how many steps mention words from the student's own description and shows it, so a generic plan is obvious.

**Why AI here:** the template gives everyone the same 6–8 generic steps. It can't know that a "presentation comparing solar, wind and hydro" needs one source per energy type and a rehearsal under 5 minutes. That's the gap the AI fills.

## Evaluation

`node eval/run.mjs` runs 15 realistic tasks (8 school, 7 everyday) in [`eval/cases.json`](eval/cases.json). With `GEMINI_API_KEY` set, it runs the same tasks through Gemini and compares.

| Engine | Valid plans | Steps specific to the task | Steps removed by guardrail | Time-budget error |
|---|---|---|---|---|
| Template (measured) | 15/15 | 11% | 0 | 4% |
| Gemini 2.5 Flash | _run `GEMINI_API_KEY=… node eval/run.mjs` and paste results_ | | | |

"Specific" counts a step if it mentions at least one keyword from the task description. It's a rough proxy: it can't tell whether a step is *good*, only whether it's about the right thing. Where it stops being useful: very short descriptions (few keywords) and tasks described with different words than the steps use.

The browser smoke test simulates Chrome's on-device model with a scripted reply containing one "here is your essay" step. ClearTask removed it, showed "1 AI step removed", built the schedule, and split a step on request, with no console errors.

## Privacy

- **Template** and **on-device AI**: your task text never leaves your computer.
- **Gemini / OpenAI-compatible**: your task text goes to that provider using *your* key. The key is kept in this tab's session storage only and is deleted when the tab closes.
- Plans are saved in your browser. There are no accounts and no ClearTask server.

## Run it

Use the live site, or build it yourself:

```bash
npm install          # react, react-dom, esbuild
sh scripts/build.sh  # outputs the static app to docs/
npm test             # unit tests
node eval/run.mjs    # evaluation
```

On-device AI needs a Chrome version with the built-in Prompt API. If it's unavailable, the AI settings say so and the other engines still work.

## AI disclosure

I'm a solo developer. I used Claude (Anthropic) as a coding assistant to write and test much of this code, and I directed the features, reviewed the output, and tested the app. Inside the app, AI is used only to draft plans and split steps, and its output is checked as described above.

## My role

**Solo developer · AI-assisted.** Product idea, feature choices, and testing.

## License

**Permission required.** © 2026 Dagmawi Melaku. You need my written permission before using, copying, or modifying this code, and any approved use must credit me with a link to this repository. Viewing, forking on GitHub, and running it to judge or review a submission are allowed without asking. To ask, [open an issue](../../issues/new). See [LICENSE](LICENSE) for the full terms.
