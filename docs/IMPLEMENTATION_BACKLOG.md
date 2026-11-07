# ClearTask — implementation backlog

**Current phase:** Planning only until the event window. Existing notes indicate Nov 21–28, 2026; verify exact dates and originality rules before coding.

## Build sequence

During permitted window: implement a deterministic planner first; add optional AI behind a server-side key and a transparent disclosure; validate output schema; provide an offline fallback; let users edit all generated steps; add progress and export; test ambiguous prompts and unsafe overconfident output. Never present AI-generated instructions as authoritative or do graded work for the student.

## Definition of done
- The primary workflow runs end-to-end without external credentials.
- Every visible control works or is explicitly labeled as a future feature.
- Keyboard navigation and responsive layout are checked.
- Sample data is visibly identified.
- README, license, AI/tool disclosure, and Devpost draft match the actual build.
- Tests and a fresh-install build are recorded truthfully.
