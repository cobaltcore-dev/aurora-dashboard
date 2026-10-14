# Classification

Give every finding exactly one severity, one category, one confidence level and a status.

## Severity

| Severity     | Use when                                                                                                                                                                   | Examples                                                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Critical** | Data from another project exposed, permission checks fail open, a crash or blank page, or an explicit hard requirement of the epic broken in a way that blocks the feature | Server code imported as a value (blank page); Create button rendered while permissions are unresolved; details page crashes on a missing field                            |
| **High**     | Functional bug users will hit, an in-scope epic requirement missing, or a violation of a `[CRITICAL]` repo rule (B.7, B.8, B.15)                                           | Required column or section missing; nested menu click also navigates; no error state for a failed list call; wrong permission key for an action                           |
| **Medium**   | Deviation from a Juno guideline or a `[STANDARD]` repo rule with real user impact, or an important path untested                                                           | No filtered-empty state; tab or search state not in the URL; modal not disabled while pending; toast used for a persistent error; missing tests for states or permissions |
| **Low**      | `[STYLE]` repo rules, minor consistency or writing issues, fallback props                                                                                                  | Title Case violations; inconsistent placeholders; `Pagination pages` instead of `totalPages`; import order                                                                |
| **Info**     | Observations, suggestions, deviations the epic mandates, pre-existing issues outside the scope                                                                             | Epic-mandated layout that differs from a Juno guideline; the same issue in an untouched page                                                                              |

When in doubt between two severities, pick the lower one and explain why.

## Category

`Requirements` · `Data & Security` · `Permissions` · `DataGrid` · `States` · `URL State` · `Page Structure & Actions` · `Modals & Forms` · `Messages & Notifications` · `UX Writing` · `Accessibility` · `Component API` · `Conventions` · `Tests` · `Build`

## Confidence

| Confidence      | Meaning                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Confirmed**   | Verified against the guideline text, the component `.d.ts` or the code, or reproduced by a test                      |
| **Likely**      | Strong evidence, but depends on something not verifiable here (e.g. runtime data, permissions in a real environment) |
| **Needs Input** | Can't be decided without the user. Put it in Open Questions instead of Findings                                      |

## Status

The review sets every finding to `Open`. `aurora-findings-remediation` later updates it to one of:

`Fixed` | `Obsolete` (no longer applies) | `Won't Fix (reason)` | `Deferred (reason / follow-up)` | `Needs Input`

## Rule source (required for every finding)

One or more of:

- `Epic §<section>`: "<short quote>"
- `Juno docs/ux/<file>.md#<section>`
- `Repo .github/copilot-instructions.md B.<n>` / `Quick Reject` / `A.<n>`
- `juno-ui-components@<version> build/components/<Name>/<Name>.component.d.ts:<line>`
- `Reference implementation <path>` (for consistency findings)

## Finding IDs

Number the findings `UI-001`, `UI-002`, ... in report order (by severity, then file). Keep the IDs stable after the report is written; the remediation skill and the user refer to them.
