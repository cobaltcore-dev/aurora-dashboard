# Classification

Give every finding exactly one severity, one category, one confidence level and a status. Measured against **Juno (UX docs + `juno-ui-components`) and the epic only** — there is no Aurora UI/UX rule tier.

## Severity

| Severity     | Use when                                                                                                                               | Examples                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Critical** | A crash or blank page, or an explicit hard requirement of the epic broken in a way that blocks the feature                             | Details page crashes on a missing field; a destructive action with no confirmation                        |
| **High**     | A functional bug users will hit, an in-scope epic requirement missing, or a Juno non-negotiable broken                                 | Required column or section missing; no error state for a failed list call; nested menu click also navigates |
| **Medium**   | A deviation from a Juno guideline with real user impact, or an important path untested                                                 | No no-matches state; modal not disabled while pending; toast used for a persistent error; a colour that doesn't render |
| **Low**      | Minor consistency or writing issues, deprecated/fallback props                                                                         | Title Case violations; inconsistent placeholders; `Pagination pages` instead of `totalPages`              |
| **Info**     | Observations, suggestions, deviations the epic mandates, pre-existing issues outside the scope                                         | Epic-mandated layout that differs from a Juno guideline; the same issue in an untouched page              |

When in doubt between two severities, pick the lower one and explain why.

## Category

`Requirements` · `Components / Custom Code` · `Colour` · `States` · `DataGrid` · `Page Structure & Actions` · `Modals & Forms` · `Messages & Notifications` · `UX Writing` · `Accessibility` · `Navigation` · `Component API` · `Tests`

Two categories carry a fixed stance:
- **`Colour`** — a colour utility not backed by a Juno token (raw Tailwind ramp or invented name) is invalid; Juno resets the default palette so it renders nothing.
- **`Components / Custom Code`** — a raw HTML element where a Juno component exists, or a hand-built widget duplicating a Juno capability, is Custom Code: a finding when Juno has an equivalent, Info (still labelled) when it does not.

## Confidence

| Confidence      | Meaning                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Confirmed**   | Verified against the Juno doc text, the component source (via `sap_juno_lookup`) or the code, or reproduced by a test |
| **Likely**      | Strong evidence, but depends on something not verifiable here (e.g. runtime data, or a Juno main-vs-pinned version difference) |
| **Needs Input** | Can't be decided without the user. Put it in Open Questions instead of Findings                                      |

## Status

The review sets every finding to `Open`. `aurora-findings-remediation` later updates it to one of:

`Fixed` | `Obsolete` (no longer applies) | `Won't Fix (reason)` | `Deferred (reason / follow-up)` | `Needs Input`

## Rule source (required for every finding)

One or more of:

- `Epic §<section>`: "<short quote>"
- `Juno docs/ux/<file>.md#<section>`
- `juno-ui-components <Name>.component.tsx:<line>` (via `sap_juno_lookup`)
- `Reference implementation <path>` (for consistency findings)

## Finding IDs

Number the findings `UI-001`, `UI-002`, ... in report order (by severity, then file). Keep the IDs stable after the report is written; the remediation skill and the user refer to them.
