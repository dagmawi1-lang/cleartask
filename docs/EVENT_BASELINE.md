# Global AI Builder's Challenge — baseline and event contribution log

## Before the event

Baseline version: **1.0.1**, prepared November 4, 2026. This entire baseline predates the November 21 event start.

Existing functionality:
- Deterministic school-task and everyday-task templates.
- Editable steps and rough effort estimates.
- Completion tracking and progress indicator.
- Browser-local persistence.
- Markdown export.
- Optional server-side AI planning endpoint with strict output normalization and a deterministic fallback. The live provider call remains unverified until configured with a valid API key.
- Input normalization and unit tests.

This baseline is not represented as event-period work.

## During November 21–28, 2026

Record only work actually completed during the official event window:

| Date | Change | Files | Test/demo evidence |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

Potential event-period improvements (not yet implemented):
1. Add targeted clarifying questions before suggesting a plan.
2. Compare AI-generated plans against the deterministic baseline on a small, documented test set.
3. Improve ambiguity handling and user correction controls.
4. Add test cases for ambiguous prompts and misleading AI suggestions.
5. Demonstrate which event-period changes measurably improve the workflow.

Do not claim any item above is complete until it is implemented and tested.

## Submission disclosure

The final Devpost entry must identify version 1.0.0 as pre-event baseline and list the specific event-period changes from the changelog. The final demo must show the actual submitted build and disclose any mocked or unfinished features.
