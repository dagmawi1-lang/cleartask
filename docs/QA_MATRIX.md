# ClearTask — QA matrix

| Area | Test | Expected result |
|---|---|---|
| First run | Open with empty browser storage | Helpful starting state; no crash |
| Main workflow | Complete the core task from start to finish | Result is understandable and usable |
| Validation | Submit missing or malformed input | Inline explanation; no broken state |
| Persistence | Refresh after a change (if persistence is implemented) | State restores accurately |
| Export | Export the user-created result | Valid file with clear filename |
| Accessibility | Keyboard-only navigation | All controls reachable and named |
| Responsive | Narrow mobile viewport | No clipped controls or horizontal overflow |
| Privacy | Inspect stored/submitted data | No unnecessary personal or sensitive data |
| Honesty | Review all sample content and claims | Demo records are labeled; no unsupported guarantees |

## Project-specific checks

During permitted window: implement a deterministic planner first; add optional AI behind a server-side key and a transparent disclosure; validate output schema; provide an offline fallback; let users edit all generated steps; add progress and export; test ambiguous prompts and unsafe overconfident output. Never present AI-generated instructions as authoritative or do graded work for the student.
