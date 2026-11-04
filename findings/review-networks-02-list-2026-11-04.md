# #1401 — List project networks: Review & Changes

|             |                                                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Date**    | 2026-11-04                                                                                                                             |
| **Ticket**  | [#1401 List project networks](https://github.com/cobaltcore-dev/aurora-dashboard/issues/1401)                                          |
| **Epic**    | [#1019 Networks (read-only) scope](https://github.com/cobaltcore-dev/aurora-dashboard/issues/1019)                                     |
| **Sources** | Spec: `docs/specs/networks/networks-readonly-spec.md` sub-issue 3 AC, decisions E2/E3/E5/E6; reference: `ClipboardText`, `ListToolbar` |
| **Status**  | Complete                                                                                                                               |

---

## Review Checklist

| #   | Criterion                                                            | Result             | Notes                                                               |
| --- | -------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------- |
| 1   | Name column — ID beneath name, ID has copy affordance                | ❌ Fail → Fixed    | ID shown as plain text; no `ClipboardText` component                |
| 2   | Status column — visible status indicator                             | ✅ Pass            | Status value displayed                                              |
| 3   | Admin State — up / down                                              | ✅ Pass            | "UP" / "DOWN" rendered                                              |
| 4   | Shared column — `project_id` + copy when shared (E2)                 | ❌ Fail → Fixed    | Showed "Yes" / "No"; E2 requires `project_id` + copy when shared    |
| 5   | External column — yes / no                                           | ✅ Pass            | "Yes" / "No" / "–" rendered                                         |
| 6   | Subnet count — `subnets.length`, no extra API call                   | ❌ Fail → Fixed    | Showed list of subnet names instead of count                        |
| 7   | MTU **not** in list (spec excludes it)                               | ❌ Fail → Fixed    | MTU column present in header, cell and sort options                 |
| 8   | Overflow menu with "View details"                                    | ✅ Pass            | `PopupMenu` with "Show Details" present                             |
| 9   | Row click navigates to detail; nested elements stop propagation      | ✅ Pass            | `onClick` on row; menu cell has `e.stopPropagation()`               |
| 10  | Sortable by **name, status, subnet count** (E3 attention-first)      | ❌ Fail → Fixed    | Sort options had MTU not subnet count; status sort was alphabetical |
| 11  | Filterable by Status + **Shared** + **External** booleans (E6)       | ❌ Fail → Fixed    | External filter missing                                             |
| 12  | No pagination (E5)                                                   | ❌ Fail → Fixed    | Pagination component and `page` URL param present                   |
| 13  | Zone 1 sort toolbar                                                  | ✅ Pass            | `SortInput` in Zone 1                                               |
| 14  | Zone 2 search + filters + pills                                      | ⚠️ Partial → Fixed | External filter was missing from Zone 2                             |
| 15  | Zone 3 — item count + last-updated, no refresh button                | ❌ Fail → Fixed    | Zone 3 absent entirely                                              |
| 16  | Loading / empty / filtered-empty / error+retry / unauthorized states | ✅ Pass            | All states handled correctly                                        |

**Result before fixes:** 6 pass / 9 fail / 1 partial  
**Result after fixes:** 16 pass / 0 fail

---

## Findings Detail

### F1 — MTU column present; spec explicitly excludes it ❌ → Fixed

**Spec (AC):** "MTU and provider/segmentation details are **not** shown in the list — they live in the detail view."

**What was in place:**  
A "MTU" column header in `NetworkListContainer.tsx` (8th data column), a corresponding cell in `NetworkTableRow.tsx`, and "MTU" as the third sort option in `NetworksList.tsx` (value `"mtu"` in the `sortBy` URL enum). `COLUMN_COUNT = 8`.

**Fix applied:**

- Removed the MTU `DataGridHeadCell` from `NetworkListContainer.tsx`; lowered `COLUMN_COUNT` to `7`.
- Removed the MTU `DataGridCell` from `NetworkTableRow.tsx`.
- Replaced `"mtu"` sort option with `"Subnet count"` (see F6).

---

### F2 — Shared column showed "Yes/No" instead of `project_id` + copy (E2) ❌ → Fixed

**Spec requirement (E2):** "For a shared network, the Shared column shows the owning project's `project_id` with a copy-to-clipboard affordance — no Keystone name lookup."

**What was in place:**  
`NetworkTableRow.tsx`: `{network.shared ? t\`Yes\` : t\`No\`}` — no project_id, no copy affordance.

**Fix applied (`NetworkTableRow.tsx`):**

- When `network.shared === true`: render `<ClipboardText text={network.project_id} truncateAt={13} />`.
- When `network.shared === false`: render `t\`No\``.

---

### F3 — Subnets column showed names, not count ❌ → Fixed

**Spec requirement (AC):** "Subnet count — derived from the network object's embedded `subnets` array (`subnets.length`); no extra API call."

**What was in place:**  
`NetworkTableRow.tsx` rendered a vertical list of `subnet_details` names (or IDs as fallback). This shows more information than the spec requires in the list and makes rows expand vertically.

**Fix applied (`NetworkTableRow.tsx`):**

- Replaced the subnet names list with `{network.subnets.length}` — a plain integer count.
- Empty count (0) shows "0", not "–" (0 is a meaningful value, not an absent one).

---

### F4 — Network ID had no copy-to-clipboard affordance in Name cell ❌ → Fixed

**Spec requirement (AC):** "Name — with the network's ID shown beneath the name; the ID has a **copy-to-clipboard affordance**."

**What was in place:**  
`TwoLineCell` rendered the ID as a plain `<span>` — no copy button.

**Fix applied (`NetworkTableRow.tsx`):**

- Inlined the Name cell (removed `TwoLineCell`).
- When the network has a name: show name as primary `<span>` + ID as `<ClipboardText>` secondary.
- When the network has no name: show the ID as the primary `<ClipboardText>`.
- `ClipboardText.handleCopy` already calls `e.stopPropagation()`, so clicking copy never triggers row navigation.

---

### F5 — External filter missing (E6 violation) ❌ → Fixed

**Spec requirement (E6):** "Filterable by the Shared and **External** flags (each a boolean true/false Select, unselected = any)."

**What was in place:**  
Only Status and Shared filters were implemented. No External filter in `networkListFilters.ts`, `NetworksList.tsx` filter definitions, or the URL schema.

**Fix applied:**

- `networkListFilters.ts`: added `NETWORK_EXTERNAL_FILTER_VALUES`, `NetworkExternalFilter` type.
- `networks/index.tsx`: added `external: z.enum(NETWORK_EXTERNAL_FILTER_VALUES).optional()` to URL schema.
- `NetworksList.tsx`: added External to `NetworkFilters`, `filterDefinitions`, `selectedFilters`, handler, and BFF query (`"router:external"` boolean).
- The `NetworkQueryParametersSchema` already had `"router:external": z.boolean().optional()`, so no BFF schema change was needed.

---

### F6 — Sort "MTU" should be "Subnet count"; status sort order wrong (E3) ❌ → Fixed

**Spec requirement (E3):** "Sortable by name, status, and **subnet count**. Status sorts in the order `ERROR → BUILD → DOWN → ACTIVE` (attention-first), flipped by the direction toggle."

**What was in place:**  
Sort options: Name / Status / MTU. `sortBy` URL enum: `["name", "status", "mtu"]`. The BFF `sortNetworks` used `localeCompare` for status — alphabetical order (`ACTIVE → BUILD → DOWN → ERROR`), not the attention-first E3 order.

**Fix applied:**

- `networks/index.tsx`: changed `sortBy` enum from `["name", "status", "mtu"]` to `["name", "status", "subnet_count"]`.
- `NetworksList.tsx`: replaced the "MTU" sort option with "Subnet count" (value `"subnet_count"`). Changed `NetworkSortKey` type accordingly.
- When `sortBy === "name"`: passes `sort_key: "name"` to the BFF (Neutron sorts efficiently).
- When `sortBy === "status"` or `"subnet_count"`: no BFF sort params — applies **client-side sort** after the BFF responds:
  - Status: uses `STATUS_ORDER = { ERROR: 0, BUILD: 1, DOWN: 2, ACTIVE: 3 }` map — unknown statuses sort last.
  - Subnet count: sorts by `a.subnets.length - b.subnets.length`.
- This satisfies the E3 attention-first order and avoids adding a non-Neutron sort key to the BFF schema.

---

### F7 — Pagination present (E5 violation) ❌ → Fixed

**Spec requirement (E5):** "No pagination in phase 1. The list renders all rows; search/sort/filter are entirely client-side over the single `network.networks.list` response."

**What was in place:**  
`NetworksList.tsx` had `PAGE_SIZE = 50`, `paginatedNetworks`, `currentPage`, `totalPages`, `handlePageChange`. `NetworkListContainer.tsx` rendered a `<Pagination>` component. The URL schema had a `page` parameter.

**Fix applied:**

- `NetworksList.tsx`: removed `PAGE_SIZE`, pagination slice, `currentPage`/`totalPages`/`handlePageChange` logic. All networks passed directly to `NetworkListContainer`.
- `NetworkListContainer.tsx`: removed `Pagination` component and all pagination-related props (`totalPages`, `currentPage`, `onPageChange`).
- `networks/index.tsx`: removed `page` from URL schema.

---

### F8 — Zone 3 missing (count + last-updated, no refresh) ❌ → Fixed

**Spec requirement (Zone 3, E1):** "Zone 3: item count ('N networks') + last-updated timestamp (relative). No refresh button."

**What was in place:**  
No Zone 3 existed. Neither the network count nor last-updated time was displayed.

**Fix applied (`NetworksList.tsx`):**

- Added `resolvedAt?: number` to `NetworksResult`; set to `Date.now()` when the BFF promise resolves.
- Added a `formatRelativeTime` helper (just-now / X min ago / X h ago).
- Added a Zone 3 row below the filters/search toolbar inside `NetworksContent`: left side shows "N networks", right side shows "Last updated: X min ago".

---

## Files changed

| File                                                 | Change                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `networks/-components/networkListFilters.ts`         | Added `NETWORK_EXTERNAL_FILTER_VALUES`, `NetworkExternalFilter` type                        |
| `networks/index.tsx`                                 | Replaced `mtu` sort with `subnet_count`; added `external` URL param; removed `page`         |
| `networks/-components/NetworkTableRow.tsx`           | Removed MTU cell; fixed Shared (E2); fixed Subnets (count); added ID copy (`ClipboardText`) |
| `networks/-components/NetworkListContainer.tsx`      | Removed MTU column; removed `Pagination`; `COLUMN_COUNT` 8 → 7                              |
| `networks/-components/NetworksList.tsx`              | Sort options/types; external filter; removed pagination; Zone 3; client-side sort           |
| `networks/-components/NetworkTableRow.test.tsx`      | Updated column assertions; removed MTU tests; added copy affordance tests                   |
| `networks/-components/NetworkListContainer.test.tsx` | Removed MTU from columns; removed Pagination tests; updated column count                    |
| `networks/-components/NetworksList.test.tsx`         | Removed Pagination tests; added External filter tests; updated sort/query assertions        |
