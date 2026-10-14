# Classification

Give every finding exactly one severity, one category, one confidence level and a status.

## Severity

| Severity     | Use when                                                                                                                      | Examples                                                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Critical** | Security or data-integrity risk, crashes, or an explicit hard requirement of the epic broken in a way that blocks the feature | Path injection via unencoded IDs; another project's data exposed; delete calls the wrong endpoint                                                                                |
| **High**     | Functional bug or wrong API usage that users will hit, or an in-scope epic requirement missing                                | Dead `.ok` error mapping (403/404 become 500); a required procedure missing; a required field missing from a schema; a list that fails to parse when an optional field is absent |
| **Medium**   | Deviation from the docs, conventions or guidelines with real but limited impact, or an important path untested                | Undocumented query param forwarded; N+1 requests; missing tests for error paths; doc contradicts code                                                                            |
| **Low**      | Minor convention, naming or style issues with no functional impact                                                            | Inconsistent parse context string; missing JSDoc line; duplicated helper                                                                                                         |
| **Info**     | Observations, suggestions, pre-existing issues outside the scope                                                              | Same dead `.ok` pattern in untouched routers                                                                                                                                     |

When in doubt between two severities, pick the lower one and explain why in the finding.

## Category

`Requirements` · `API Conformance` · `Schema` · `Error Handling` · `Security` · `Performance` · `Conventions` · `Tests` · `Docs` · `Build`

## Confidence

| Confidence      | Meaning                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Confirmed**   | Verified against the docs or the code, or reproduced by a test                                                   |
| **Likely**      | Strong evidence, but depends on something not verifiable here (e.g. the deployment's policy, enabled extensions) |
| **Needs Input** | Can't be decided without the user. Put it in Open Questions instead of Findings                                  |

## Status (updated in Phase 2)

`Open` → `Fixed` | `Won't Fix (reason)` | `Deferred (reason / follow-up)` | `Needs Input`

## Finding IDs

Number the findings `BFF-001`, `BFF-002`, ... in report order (by severity, then file). Keep the IDs stable after the report is written; Phase 2 and the user refer to them.
