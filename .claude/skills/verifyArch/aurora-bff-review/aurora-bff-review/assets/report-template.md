# BFF Review: <Resource>

|                    |                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **Date**           | <YYYY-MM-DD>                                                                              |
| **Commit**         | `<sha>` (base: `<base ref>`)                                                              |
| **Scope**          | <n> files: <short description, e.g. "Network ports: types, helpers, router, tests, docs"> |
| **Epic**           | <title / link>                                                                            |
| **OpenStack docs** | <API ref URLs used>                                                                       |
| **Status**         | Analysis complete / Remediation in progress / Remediation complete                        |

## Summary

<2–4 sentences: overall verdict, the most important problems, what's solid.>

| Severity | Open | Fixed | Deferred | Won't Fix |
| -------- | ---- | ----- | -------- | --------- |
| Critical | 0    | 0     | 0        | 0         |
| High     | 0    | 0     | 0        | 0         |
| Medium   | 0    | 0     | 0        | 0         |
| Low      | 0    | 0     | 0        | 0         |
| Info     | 0    | –     | –        | –         |

Verification: `<verify.sh command>` → <passed / failed: which steps>

## Requirements Traceability

| ID     | Requirement (epic section)                    | Priority | Status      | Evidence / Finding |
| ------ | --------------------------------------------- | -------- | ----------- | ------------------ |
| REQ-01 | <requirement> (_"<short quote>"_, §<section>) | P1       | Implemented | `<file>:<line>`    |
| REQ-02 | <requirement>                                 | P2       | Missing     | BFF-003            |
| REQ-03 | <requirement>                                 | P2       | Unclear     | Q-1                |

## Findings

### Critical

_None._

### High

#### BFF-001: <Short title>

- **Category:** <Error Handling>
- **Confidence:** <Confirmed>
- **Status:** Open
- **Location:** `packages/aurora/src/server/<...>.ts:<line>`
- **Rule:** <Epic §… / OpenStack API ref: <url>#<section> / repo doc / reference implementation `<file>`>
- **Expected:** <what the rule requires>
- **Actual:** <what the code does>

  ```ts
  // relevant excerpt (keep it short)
  ```

- **Impact:** <what goes wrong for users or callers>
- **Recommendation:** <how to fix, following the module's conventions>

### Medium

### Low

### Info

## Open Questions

| ID  | Question   | Why it matters                | Blocks          |
| --- | ---------- | ----------------------------- | --------------- |
| Q-1 | <question> | <which verdict depends on it> | REQ-03, BFF-00x |

## Verified OK

- <check>: <one-line evidence>

## Not Verified

- <check>: <reason, e.g. "API ref unavailable", "depends on deployment policy">

## Pre-existing / Out of Scope

- <issue in untouched code, location> (Info)

## Remediation Log

_Phase 2 entries: date, findings, files changed, verification, proposed commits._
