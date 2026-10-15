# UI Review: <Resource>

|             |                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Date**    | <YYYY-MM-DD>                                                                                                              |
| **Commit**  | `<sha>` (base: `<base ref>`)                                                                                              |
| **Scope**   | <n> files: <short description, e.g. "Network ports: routes, list, details, nav, card, tests">                             |
| **Epic**    | <title / link>                                                                                                            |
| **UI mode** | Read-only / Full CRUD                                                                                                     |
| **Sources** | Juno docs: <files>; repo rules: `.github/copilot-instructions.md`; juno-ui-components@<version>; design: <link or "none"> |
| **Status**  | Analysis complete                                                                                                         |

## Summary

<2–4 sentences: overall verdict, the most important problems, what's solid.>

| Severity | Open | Fixed | Deferred | Won't Fix |
| -------- | ---- | ----- | -------- | --------- |
| Critical | 0    | 0     | 0        | 0         |
| High     | 0    | 0     | 0        | 0         |
| Medium   | 0    | 0     | 0        | 0         |
| Low      | 0    | 0     | 0        | 0         |
| Info     | 0    | –     | –        | –         |

Tooling (typecheck, lint, format, tests, i18n) was not run during the review; CI and `aurora-findings-remediation` cover it.

## Requirements Traceability

| ID     | Requirement (epic section)                    | Priority | Status      | Evidence / Finding |
| ------ | --------------------------------------------- | -------- | ----------- | ------------------ |
| REQ-01 | <requirement> (_"<short quote>"_, §<section>) | P1       | Implemented | `<file>:<line>`    |
| REQ-02 | <requirement>                                 | P2       | Missing     | UI-003             |
| REQ-03 | <requirement>                                 | P2       | Unclear     | Q-1                |

## Findings

### Critical

_None._

### High

#### UI-001: <Short title>

- **Category:** <States>
- **Confidence:** <Confirmed>
- **Status:** Open
- **Location:** `packages/aurora/src/client/routes/<...>.tsx:<line>`
- **Rule:** <Epic §… / Juno docs/ux/<file>.md#<section> / repo B.<n> / juno-ui-components .d.ts / reference implementation `<file>`>
- **Expected:** <what the rule requires>
- **Actual:** <what the code does>

  ```tsx
  // relevant excerpt (keep it short)
  ```

- **Impact:** <what goes wrong for users or callers>
- **Recommendation:** <how to fix, following the module's conventions>

### Medium

### Low

### Info

## Open Questions

| ID  | Question   | Why it matters                | Blocks         |
| --- | ---------- | ----------------------------- | -------------- |
| Q-1 | <question> | <which verdict depends on it> | REQ-03, UI-00x |

## Verified OK

- <check>: <one-line evidence>

## Not Verified

- <check>: <reason, e.g. "Juno doc unavailable", "needs the running app (hover, focus)">

## Pre-existing / Out of Scope

- <issue in untouched code, location> (Info)

## Remediation Log

_Filled in by `aurora-findings-remediation`: one entry per run (findings, answers, files changed, verification, manual checks, proposed commits)._
