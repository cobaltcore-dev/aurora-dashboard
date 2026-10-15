# 🧪 UI Review — <Resource>

**Scope** <n> files: <short description> · **Commit** `<sha>` (base `<base ref>`) · **Date** <YYYY-MM-DD> · **UI mode** Read-only / Full CRUD · **Epic** <title / link>

**Sources** — Juno docs: <files> · `juno-ui-components@<version>` · design: <link or "none">

> [!NOTE]
> **Verdict —** <2-4 sentences: overall, the most important problems, what's solid.> Analysis only — no code was changed; fixes run separately via `aurora-findings-remediation`.

**Legend —** result `✅ pass` · `❌ not valid` · `⚠️ open question` · `◻️ not verified` severity `🔴 Critical` · `🟠 High` · `🟡 Medium` · `🔵 Low` · `⚪ Info`

Tooling (typecheck, lint, format, tests, i18n) was **not** run; CI and `aurora-findings-remediation` cover it.

---

## 📊 Scorecard

**Severity:** 🔴 0 · 🟠 0 · 🟡 0 · 🔵 0 · ⚪ 0

| Severity | Open | Fixed | Deferred | Won't Fix |
| -------- | :--: | :---: | :------: | :-------: |
| Critical |  0   |   0   |    0     |     0     |
| High     |  0   |   0   |    0     |     0     |
| Medium   |  0   |   0   |    0     |     0     |
| Low      |  0   |   0   |    0     |     0     |
| Info     |  0   |   –   |    –     |     –     |

## 🎯 Findings at a Glance

| ID     | Sev | Category | Finding         |
| :----- | :-: | :------- | :-------------- |
| UI-001 | 🟡  | States   | <short finding> |

---

## 📋 Requirements Traceability

| ID     | Requirement (epic §)                          | Priority | Status         | Evidence / Finding |
| :----- | :-------------------------------------------- | :------: | :------------- | :----------------- |
| REQ-01 | <requirement> (_"<short quote>"_, §<section>) |    P1    | ✅ Implemented | `<file>:<line>`    |
| REQ-02 | <requirement>                                 |    P2    | ❌ Missing     | UI-003             |
| REQ-03 | <requirement>                                 |    P2    | ⚠️ Unclear     | Q-1                |

---

---

# Findings

### 🟡 UI-001 — <short title>

|                |                                                                                                                |
| :------------- | :------------------------------------------------------------------------------------------------------------- |
| **Severity**   | 🟡 Medium                                                                                                      |
| **Category**   | <States / Colour / Components / Custom Code / Modals & Forms / UX Writing / Accessibility / Component API / …> |
| **Confidence** | <Confirmed / Likely>                                                                                           |
| **Status**     | Open                                                                                                           |
| **Where**      | `packages/aurora/src/client/routes/<…>.tsx:<line>`                                                             |
| **Rule**       | <Epic §… / Juno `docs/ux/<file>.md#<section>` / `juno-ui-components <Name>.component.tsx:<line>`>              |

**What's wrong** — <plain explanation a dev can act on, no jargon>

**Current code**

```tsx
// <file>:<line>
<the offending snippet, kept short>
```

**Why it's not valid** — <concrete runtime/user impact>

**How to fix**

```tsx
<the corrected, Juno-conformant snippet>
```

---

_(repeat the block per finding, ordered by severity then file)_

---

---

## ⚠️ Open Questions

| ID  | Question   | Why it matters                | Blocks         |
| :-- | :--------- | :---------------------------- | :------------- |
| Q-1 | <question> | <which verdict depends on it> | REQ-03, UI-00x |

## 📑 Coverage Ledger

Every applicable checklist item (`references/checklist.md`), one row, exactly one disposition. An applicable check may **not** be absent; `➖ n/a` and `◻️ not verified` require a reason. This is the no-silent-drop guard — a known rule can't quietly disappear.

| Check (checklist §)                             |   Disposition   | Finding / reason                          |
| :---------------------------------------------- | :-------------: | :---------------------------------------- |
| DataGrid: primary/"Create" action in Zone 1 (§5) | ✅ / ❌ / ➖ / ◻️ | `datagrid.md#zone-1` · UI-00x / reason    |
| DataGrid: search end-aligned (§5)               | ✅ / ❌ / ➖ / ◻️ | Storybook `DataGridHeader/WithSearchOnly` |
| _(one row per applicable checklist item)_       |                 |                                           |

## ✅ Verified OK

- <check>: <one-line evidence + Juno source>

## ◻️ Not Verified

- <check>: <reason, e.g. "Juno doc unavailable", "needs the running app (hover, focus)">

## 🧹 Pre-existing / Out of Scope

- <issue in untouched code, location> (⚪ Info)

---

## 📚 Appendix: Sources

Self-contained — follow each without this skill installed.

**Juno UX docs** — `docs/ux/<file>.md#<section>` _(<finding ids>)_
**Juno component source** — `<Name>.component.tsx:<line>` (via `sap_juno_lookup`) _(<finding ids>)_
**Juno Storybook** — https://cloudoperators.github.io/juno/

## 🔧 Remediation Log

_Filled in by `aurora-findings-remediation`: one entry per run (findings, answers, files changed, verification, manual checks, proposed commits)._

**Remediation disposition (mandatory — no silent drop).** Every finding in this report — each severity, ❌ and ⚠️ alike — gets exactly one resolution row. A finding left unaddressed is recorded as `Skipped` with a reason and who decided (e.g. a scope decision like "read-only P1, stubs left"), never silently omitted.

| Finding | Resolution                                        | Reason   | Decided by             |
| :------ | :------------------------------------------------ | :------- | :--------------------- |
| UI-001  | Fixed / Skipped / Deferred / Won't Fix / Obsolete | <reason> | <user / scope decision> |
