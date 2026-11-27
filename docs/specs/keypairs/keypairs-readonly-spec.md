# Spec: Keypairs (read-only) scope

Source BRD: [keypairs-readonly-brd.md](keypairs-readonly-brd.md)
Source Epic: [keypairs-readonly-epic.md](../../../output/epics/keypairs-readonly-epic.md)
Related: [differentiation-between-skills-epic-and-july3-existing-epic.md](differentiation-between-skills-epic-and-july3-existing-epic.md)
Development context (source of truth): the sibling compute resources `instances` / `flavors` / `images` (verified reference implementations), plus the project's Aurora & Juno UX guidelines.
Status: ready-for-engineering

> **Scope framing (BRD §6).** Phase 1 is strictly **read-only** — no create/import/delete. It ships a **keypair list** and a **name-keyed keypair detail** page, as a net-new resource inside Aurora's existing `compute` scope (peer to Images / Flavors). **Two GET requests** (stakeholder decision): the list reuses the existing `compute.getKeypairsByProjectId` (`GET /os-keypairs`); the detail uses a **new** by-name procedure (`GET /os-keypairs/{keypair_name}`). Search/sort/filter, pagination, and a microversion investigation are deferred to T-04.

## Confirmed UX / component decisions (grounded in the sibling compute scopes + Juno)

Use these verbatim — they mirror the `flavors` / `images` resources already in the `compute` scope:

1. **List toolbar — `DataGridToolbar`** (`@cloudoperators/juno-ui-components`), as the flavors list uses — NOT `ListToolbar` (that dir only supplies `SortInput`/types). In phase 1 the toolbar carries **no search, sort, or filter controls** (deferred — E2); it hosts only the count/header zone. `SortInput` from `@/client/components/ListToolbar/SortInput` is **not** wired in phase 1.
2. **Row navigation — clickable row + scaffolded overflow menu.** The whole `DataGridRow` is clickable and navigates to the detail route; the last cell holds a Juno `PopupMenu` with a single **"View details"** item and calls `event.stopPropagation()`. Retained as the phase-1 extension point for future row actions.
3. **Detail presentation — full route page in the FILE form** at `…/compute/keypairs/$keypairName`, matching `compute/flavors/$flavorId.tsx` and `compute/images/$imageId.tsx` (flat file + a co-located `keypairs/-components/` subtree). Deep-linkable and bookmarkable.

## Confirmed engineering decisions (grounded in the Aurora codebase, 2026-11-26)

Verified against `server/Compute/**` and the sibling `compute` client routes:

- **E1 — No refresh mechanism in phase 1.** No `refetchInterval`, no SSE, no manual refresh button. Data loads on navigation / mount, matching the sibling compute resources.
- **E2 — No pagination / search / sort / filter in phase 1.** All deferred to T-04. (The `flavors` list does client-side paging at `PAGE_SIZE = 50`; keypair lists are small and the BRD defers these, so phase 1 renders all rows plainly.)
- **E3 — List reuses the existing server procedure.** `compute.getKeypairsByProjectId` already exists (`server/Compute/routers/keypairRouter.ts`): `.input(projectScopedInputSchema)`, calls `ctx.openstack?.service("compute")?.get("os-keypairs")`, parses `keypairsResponseSchema`, returns the unwrapped `keypair[]`. **No new list code on the server.** Fetch on the client with the sibling pattern — vanilla `trpcClient.compute.getKeypairsByProjectId.query(...)` wrapped in a React 19 `use(promise)` consumed inside `<Suspense>` + `<ErrorBoundary>` (`react-error-boundary`), rendering Juno `DataGrid` + `Status`.
- **E4 — Detail uses a NEW by-name procedure (the two-GET decision).** Add `getKeypairByName` to the exported `keypairRouter` object (no `index.ts` change needed): `.input(projectScopedInputSchema.extend({ keypairName: z.string().min(1) }))`, call `compute.get(\`os-keypairs/${encodeURIComponent(keypairName)}\`)`, parse with the **existing** `keypairResponseSchema`, return the unwrapped `.keypair`. Client detail route `compute/keypairs/$keypairName.tsx`(file form) fetches via`trpcReact.compute.getKeypairByName.useQuery({ project_id, keypairName })`+ a`loader`that prefetches for the`<head>` title. Route param is the keypair **name** (URL-encoded; names are not UUIDs).
- **E5 — No microversion sent (matches the current `keypairRouter`).** The existing list call sets no Compute microversion, and the new detail call follows suit. Consequence: `type`, `user_id`, and `created_at` are microversion-gated in Nova (≈2.2 / ≈2.10) and **may be absent** — every such field renders the `- -` empty placeholder rather than failing. **⚠️ Open item:** investigate adding a Compute microversion so these three fields are reliably returned (tracked in T-04 and Open items).
- **E6 — List is project-scoped (reuse `getKeypairsByProjectId` as-is).** Empty state reads "No keypairs in this project". **⚠️ Open item (O1):** Nova keypairs are _user-owned_, but this procedure is project-scoped — check whether any keys are genuinely shared/public across servers in practice; if not, project-scoped stands and no filtering is added.
- **E7 — Permissions.** Add `keypairs:list` → `os_compute_api:os-keypairs:index` and `keypairs:show` → `os_compute_api:os-keypairs:show` to `COMPUTE_IMAGE_MAPPINGS` (`server/Compute/routers/permissionRouter.ts`). Read-only ⇒ no per-row/action permission logic; `canUser` is used only to gate the nav entry's visibility and the unauthorized `Status` state. _(Exact policy rule names: O2.)_
- **E8 — Type tolerance & empty cells.** `type` is `ssh` | `x509` | string-fallback (per the existing `keypairSchema`); unknown types never break the page. Any absent optional field renders `- -`. `private_key` is never requested or rendered.
- **E9 — Copy, i18n, tests.** Copy-to-clipboard via `ClipboardText` (`@/client/components/ClipboardText`) for fingerprint, public key, and user ID (Name is **not** copyable, per BRD). All strings via Lingui (`t` / `<Trans>`). Co-located Vitest component tests + Playwright e2e, matching the siblings.

**Naming:** the user-facing label is **"Keypairs"** (BRD). OpenStack calls "keypair" _badly named_ and the legacy dashboard used "SSH Keys" — see Open items; this affects only the label/nav/title/i18n, not route/tRPC/type identifiers (which stay `keypair`).

## Epic index

| Ticket | Title                                                | In MVP? | Blocked by |
| ------ | ---------------------------------------------------- | :-----: | ---------- |
| T-00   | API & environment gate                               | prereq  | —          |
| T-01   | Scope scaffold — routing, nav, guard, permission map | prereq  | T-00       |
| T-02   | List keypairs page                                   | ✅ MVP  | T-01       |
| T-03   | Keypair detail page (new by-name procedure)          | ✅ MVP  | T-02       |
| T-04   | Post-implementation polish & deferred items          |  later  | T-02, T-03 |

## Dependency graph

```
T-00  API & env gate
└─ T-01  Scaffold (client routes + nav + guard + permission mapping)
   └─ T-02  List keypairs ─────────────────── (MVP releasable: T-02 + T-03)
      └─ T-03  Keypair detail (new getKeypairByName)
         └─ T-04  Polish & deferred   ◄─ also depends on T-02
```

Critical path to MVP: **T-00 → T-01 → T-02 → T-03**.

---

## T-00 — API & environment gate

**What to build:** Nothing to code — a verification gate so downstream tickets have a green light.
**Blocked by:** None · **Status:** ready-for-agent

**Checklist**

- [ ] Confirm OpenStack **Nova (compute, v2.1)** is reachable via the Keystone catalog (already used by instances/flavors/images).
- [ ] Confirm the test project returns keypairs to render (already confirmed listable in the legacy dashboard, Elektra), or fall back to realistic mock data.
- [ ] Note the microversion caveat (E5): without a requested microversion, `type` / `user_id` / `created_at` may be absent in responses.

**BRD Reference** — API §7.

---

## T-01 — Scope scaffold, routing, nav, guard & permission mapping

**What to build:** The net-new `keypairs` resource shell inside the existing `compute` scope so an (initially empty) Keypairs page renders, is reachable from nav, is catalog-gated, and is policy-gated.
**Blocked by:** T-00 · **Status:** ready-for-agent

**Acceptance Criteria**

- [ ] Client route tree: `compute/keypairs.tsx` (parent layout, `component: () => <Outlet />`) with a `beforeLoad` catalog guard copying the flavors pattern — `getServiceIndex(availableServices)`; `if (!serviceIndex["compute"]?.["nova"]) throw redirect({ to: "/projects/$projectId", params: { projectId } })`.
- [ ] `compute/keypairs/index.tsx` (thin route) with `staticData` satisfying `RouteInfo` (`section: "compute"`, `service: "keypairs"`, `analytics.name: "compute.keypairs.list"`), `head` title via Lingui `t`, rendering `<ContentHeader>` + the `-components/List` component.
- [ ] A **Keypairs** nav entry in `buildNavSections.ts` inside `computeServices`, gated `serviceIndex?.["compute"]?.["nova"] && isEnabled("keypairs")`, label `t\`Keypairs\``, navigating to `/projects/$projectId/compute/keypairs`. Wire `"keypairs"` into the enabled-services plumbing (deny-wins).
- [ ] Add `keypairs:list` / `keypairs:show` mappings to `COMPUTE_IMAGE_MAPPINGS` (E7).
- [ ] A user without the Nova keypair read capability does not see the nav entry and sees the standard unauthorized `Status` if they reach the route (not a crash/blank page).

**Aurora / Juno implementation notes** — reference `compute/flavors.tsx` (guard + search schema), `compute/flavors/index.tsx` (thin route), `buildNavSections.ts` (computeServices), `permissionRouter.ts` (mappings). The server **list** router is already registered — nothing to add in `routers/index.ts`.

**BRD Reference** — Target Surface §3 · API §7 (Catalog, Discovery) · Auth §8 · Appendix.

---

## T-02 — List keypairs page

**What to build:** The keypairs list — a Juno `DataGrid` of the project's keypairs with clickable rows, a scaffolded overflow menu, and copy-on-fingerprint; handles its own loading / empty / error / unauthorized states.
**Blocked by:** T-01 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to see a list of my project's keypairs, so that I can find a key and read its fingerprint and type at a glance.

**Acceptance Criteria** (BRD §5.1 Story 1)

- [ ] Lists all keypairs via the existing `compute.getKeypairsByProjectId` (`GET /os-keypairs`). Each row shows:
  - [ ] **Name**
  - [ ] **Fingerprint** — with a `ClipboardText` copy affordance
  - [ ] **Type** — `ssh` / `x509`, tolerant; renders `- -` if absent (E5/E8)
  - [ ] a last-column **overflow menu** (`PopupMenu`) with a single **"View details"** item
- [ ] The whole row is clickable → navigates to `compute/keypairs/$keypairName`; the overflow menu / copy affordance call `event.stopPropagation()`
- [ ] **No** search / sort / filter / pagination (E2) — all rows render over the single list response
- [ ] The full public key is **not** shown in the list (detail only) — _design-team note carried from the BRD: revisit whether/how the public key ever appears in the list_
- [ ] **States:** `Status` progress fallback (Suspense) while loading; a friendly empty state ("No keypairs in this project" — E6); a scoped error `Status` with retry on 5xx/timeout; the standard unauthorized state on 403

**Aurora / Juno implementation notes** — fetch via the vanilla client + `use(promise)` + `<Suspense>`/`<ErrorBoundary>` (the `flavors/-components/List.tsx` pattern); compose `DataGrid` + `DataGridRow`/`DataGridHeadCell`/`DataGridCell` + `Status` + `PopupMenu` from `@cloudoperators/juno-ui-components`; `DataGridToolbar` for the header zone (no controls this phase); `ClipboardText` for the fingerprint; Lingui throughout.

**BRD Reference** — §5.1 Story 1 · Error/empty states §7 · Auth §8.

---

## T-03 — Keypair detail page

**What to build:** The keypair detail route — a full page showing the keypair's metadata and the full public key, backed by a **new** by-name server procedure. Handles its own load / not-found / error / unauthorized states.
**Blocked by:** T-02 · **Status:** ready-for-agent

**User story:** As a Project Member (Viewer), I want to open a keypair and see all its attributes and the full public key, so that I can inspect it and copy the key without the CLI.

**Acceptance Criteria** (BRD §5.1 Story 2)

- [ ] **Server:** add `getKeypairByName` to `keypairRouter` — `.input(projectScopedInputSchema.extend({ keypairName: z.string().min(1) }))`, `compute.get(\`os-keypairs/${encodeURIComponent(keypairName)}\`)`, parse with `keypairResponseSchema`, return `.keypair` (E4). No microversion header (E5).
- [ ] **Route:** `compute/keypairs/$keypairName.tsx` (file form), param = keypair name (URL-encoded); fetch via `trpcReact.compute.getKeypairByName.useQuery` + a prefetch `loader` for the head title; `useSetBreadcrumb(Route.id, keypair?.name)`.
- [ ] Shows: **Name**, **Type**, **Fingerprint** (copy), **Public key** (full, copy, in a code block), **Created at**, **User ID** (raw UUID, copy; **not** name-resolved — no N+1). The three microversion-gated fields (Type, User ID, Created at) render `- -` when absent (E5).
- [ ] `private_key` is never requested or shown (E8).
- [ ] **States:** `Status` progress while pending; a `404` not-found `Status` ("Keypair Not Found") when the name doesn't resolve; a scoped error `Status`/`RouteIdLevelDefaultError` with a "Back to Keypairs" action on failure; unauthorized state on 403.

**Aurora / Juno implementation notes** — mirror `compute/flavors/$flavorId.tsx` / `images/$imageId.tsx` (route-level `errorComponent` = `RouteIdLevelDefaultError` with a Back button); detail body in `keypairs/-components/KeypairDetailsView.tsx`; `ClipboardText` for fingerprint / public key / user ID.

**BRD Reference** — §5.1 Story 2 · Out-of-Scope §4 (no name resolution) · API §7.

---

## T-04 — Post-implementation polish & deferred items

**What to build:** The work the BRD deferred plus code-review corrections. A single trailing bucket; not part of the MVP.
**Blocked by:** T-02, T-03 · **Status:** backlog

**Checklist**

- [ ] **Microversion investigation (E5):** evaluate requesting a Compute microversion (≈2.10) so `type` / `user_id` / `created_at` are reliably returned on list and detail; wire it into the keypair calls if adopted.
- [ ] Pagination (`limit` / `marker`) — server-side, microversion-gated (Nova ≈2.35).
- [ ] Search / sort / filter (client-side first, matching the siblings).
- [ ] General polish / corrections surfaced during code review.

**BRD Reference** — Out-of-Scope §4 · Release Scope §6.

---

## Open items roll-up

**Resolved during the spec session (2026-11-26):**

- ~~**Detail data source**~~ → **E4:** new `getKeypairByName` by-name procedure (two-GET design).
- ~~**Microversion for the MVP**~~ → **E5:** none sent now; gated fields render `- -`; adding one is a T-04 investigation.
- ~~**List scope**~~ → **E6:** project-scoped as-is (reuse the existing procedure).

**Residual (resolve before/at build):**

- **Naming — "Keypairs" vs "SSH Keys".** Label only; discuss before UI polish. Internals stay `keypair`.
- **Microversion (E5, T-04):** whether to request one so `type` / `user_id` / `created_at` are reliably returned.
- **O1 — List scope semantics:** confirm whether any keypairs are genuinely shared/public across servers; if not, project-scoped (E6) stands with no user-filtering.
- **O2 — Permission policy keys:** confirm the exact Nova rules (`os_compute_api:os-keypairs:index` / `:show`) against the deployment's `compute.json`.
- **Non-blocking BRD deferrals:** owning team + target quarter (Q-N1), rollout & go-live comms (Q-N2), cross-team / security review (Q-N3).
