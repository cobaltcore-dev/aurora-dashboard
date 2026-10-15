# 🧪 BFF Review — <Resource>

**Scope** <n> files: <short description, e.g. "Network ports: types, helpers, router, tests, docs"> · **Commit** `<sha>` (base `<base ref>`) · **Date** <YYYY-MM-DD> · **Epic** <title / link>

**OpenStack docs** — <API ref URLs used>

> [!NOTE]
> **Verdict —** <2-4 sentences: overall, the most important problems, what's solid.> Analysis only — no code was changed; fixes run separately via `aurora-findings-remediation`.

**Legend —** result `✅ pass` · `❌ not valid` · `⚠️ open question` · `◻️ not verified` severity `🔴 Critical` · `🟠 High` · `🟡 Medium` · `🔵 Low` · `⚪ Info`

Tooling (typecheck, lint, format, tests) was **not** run; CI and `aurora-findings-remediation` cover it.

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

| ID      | Sev | Category       | Finding         |
| :------ | :-: | :------------- | :-------------- |
| BFF-001 | 🟡  | Error Handling | <short finding> |

---

## 📋 Requirements Traceability

| ID     | Requirement (epic §)                          | Priority | Status         | Evidence / Finding |
| :----- | :-------------------------------------------- | :------: | :------------- | :----------------- |
| REQ-01 | <requirement> (_"<short quote>"_, §<section>) |    P1    | ✅ Implemented | `<file>:<line>`    |
| REQ-02 | <requirement>                                 |    P2    | ❌ Missing     | BFF-003            |
| REQ-03 | <requirement>                                 |    P2    | ⚠️ Unclear     | Q-1                |

---

---

# Findings

### 🟡 BFF-001 — <short title>

|                |                                                                                                   |
| :------------- | :------------------------------------------------------------------------------------------------ |
| **Severity**   | 🟡 Medium                                                                                         |
| **Category**   | <Error Handling / API Conformance / Schema / Security / Performance / Conventions / Tests / Docs> |
| **Confidence** | <Confirmed / Likely>                                                                              |
| **Status**     | Open                                                                                              |
| **Where**      | `packages/aurora/src/server/<…>.ts:<line>`                                                        |
| **Rule**       | <Epic §… / OpenStack API ref `<url>#<section>` / repo doc / reference impl `<file>`>              |

**What's wrong** — <plain explanation a dev can act on>

**Current code**

```ts
// <file>:<line>
<the offending snippet, kept short>
```

**Why it's not valid** — <concrete impact on users/callers>

**How to fix**

```ts
<the corrected snippet, following the module's conventions>
```

---

_(repeat the block per finding, ordered by severity then file)_

---

---

## ⚠️ Open Questions

| ID  | Question   | Why it matters                | Blocks          |
| :-- | :--------- | :---------------------------- | :-------------- |
| Q-1 | <question> | <which verdict depends on it> | REQ-03, BFF-00x |

## ✅ Verified OK

- <check>: <one-line evidence>

## ◻️ Not Verified

- <check>: <reason, e.g. "API ref unavailable", "depends on deployment policy">

## 🧹 Pre-existing / Out of Scope

- <issue in untouched code, location> (⚪ Info)

---

## 🔧 Remediation Log

_Filled in by `aurora-findings-remediation`: one entry per run (findings, answers, files changed, verification, manual checks, proposed commits)._
