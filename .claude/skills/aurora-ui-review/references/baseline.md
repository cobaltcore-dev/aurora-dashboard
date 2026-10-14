# Baseline: repo UI rules and existing UIs

Re-check these facts in the repo before relying on them; the code evolves.

## Repo UI rules: `.github/copilot-instructions.md`

This is the team's review guideline. Use it together with the Juno docs.

- **Review scope, what NOT to review:** don't report what tooling enforces.
  - Typed union prop values (e.g. whether `"no-matches"` is a valid `Status`): strict TypeScript checks them. Do review the _semantic_ choice.
  - Formatting: Prettier.
  - General type correctness: `tsc`.
  - Unwrapped i18n strings in `packages/aurora`: `eslint-plugin-lingui`.

  Run `scripts/verify.sh` instead, and report its failures under category `Build`.

- **Three review passes.** Use them as the order of the analysis:
  1. Security & Data: B.7, B.8, B.15.
  2. UI Correctness: B.1, B.4, B.5, B.6, B.9, B.11.
  3. Style & Consistency: B.2, B.3, B.10, B.12–B.14, B.16–B.19.
- **Quick Reject Checklist.** Every item is a check; violations are findings.
- **Part A** (architecture): React 19 (`useEffect` minimization, `use()`), tRPC type safety and error handling, TanStack Router (file routes, loaders, typed navigation), Juno components first.
- **Part B tags** map to default severities:

  | Tag                           | Default severity                                                                       |
  | ----------------------------- | -------------------------------------------------------------------------------------- |
  | `[CRITICAL]` (B.7, B.8, B.15) | High; Critical if data from another project is exposed, or permission checks fail open |
  | `[STANDARD]`                  | Medium                                                                                 |
  | `[STYLE]`                     | Low                                                                                    |

## Reference implementations

| Pattern                                                           | Reference                                                                                                           | Notes                                                                                                                       |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Read-only list + details with tabs                                | `client/routes/_auth/projects/$projectId/network/routers/`                                                          | List via Promise + `use()`; enrichment-based columns; `cellVerticalAlignment="top"`; only the resource's own ID in the list |
| Full CRUD list (modals, mutations)                                | `.../network/floatingips/`                                                                                          | `trpcReact` queries, `-hooks/useFloatingIpMutations.ts`, `-modals/`                                                         |
| Permissions hook, controlled tabs                                 | `.../network/securitygroups/`                                                                                       | `-hooks/useSecurityGroupPermissions.ts`; `SecurityGroupTabs` (`activeTab` / `onTabChange` with a type guard)                |
| Details page states (pending / error / not found), header actions | `.../compute/flavors/$flavorId.tsx`, `FlavorDetailsView.tsx`                                                        | Part B of the repo rules is derived from Flavors and Storage Ceph                                                           |
| Navigation entry, service card                                    | `client/routes/_auth/projects/-components/buildNavSections.ts`, `client/routes/_auth/projects/$projectId/index.tsx` | Gated by the catalog check and `enabledServices`                                                                            |

## Known deviations in existing UIs

Don't treat these as patterns to follow. If **new** code copies one, it is a finding in the reviewed code. In untouched code, it is Info under "Pre-existing".

| Deviation                                                            | Where (at time of writing)             | Correct                                                                                     |
| -------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Pagination pages={…}`                                               | Flavors, Routers list containers       | `totalPages`. `pages` is documented in the package as a backward-compatibility fallback     |
| `useEffect` after an early `return`                                  | Flavors `List.tsx`                     | All hooks before any early return                                                           |
| Details tab state in `useState`                                      | Routers details (unless already fixed) | `tab` search param (B.9), owned by the route                                                |
| Mixed empty-value dashes (`–` vs `—`) between list and details views | Routers                                | One consistent placeholder per view                                                         |
| `if (!response.ok)` handling assumed in UI error flows               | Several BFF routers                    | The BFF maps errors via `requestOrThrow`. UI error handling should rely on tRPC error codes |
