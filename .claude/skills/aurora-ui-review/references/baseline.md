# Baseline: existing Aurora UIs (reference only)

This file carries **no rules and no authority** — the UI/UX authority is Juno (UX docs + `juno-ui-components`) and the epic. It only points at existing Aurora UIs so you can understand the structure of the client and so a finding's suggested fix can match the house style, and lists known anti-patterns not to copy. Re-check these facts in the repo before relying on them; the code evolves.

## Understanding the structure

Scan these to learn how the client is organized, so you can find and follow the reviewed code. Don't measure the reviewed code against them.

| To understand                                                                                            | Look at                                                                                                             |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Route layout: layout route, list `index.tsx`, details `$<id>.tsx`, `-components/`, `-hooks/`, `-modals/` | Any resource folder under `client/routes/_auth/projects/$projectId/<module>/`, e.g. `network/routers/`              |
| How `staticData` (section, service, crumb, analytics) is consumed                                        | The project layout route and `client/routes/routeInfo`                                                              |
| How navigation and service cards are wired (catalog check, `enabledServices`)                            | `client/routes/_auth/projects/-components/buildNavSections.ts`, `client/routes/_auth/projects/$projectId/index.tsx` |
| How data reaches a page                                                                                  | The route's loader and context, `trpcReact` / `trpcClient` usage, the BFF procedure the page calls                  |
| How permissions reach components                                                                         | The module's `-hooks/use<Resource>Permissions.ts` (if any) and the `canUser` procedure                              |
| Where tests live and how they're set up                                                                  | `*.test.tsx` next to the components (providers, mocks)                                                              |

## Reference implementations (style only)

| Pattern                                                           | Reference                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Read-only list + details with tabs                                | `client/routes/_auth/projects/$projectId/network/routers/`                                 |
| Full CRUD list (modals, mutations)                                | `.../network/floatingips/`                                                                 |
| Permissions hook, controlled tabs                                 | `.../network/securitygroups/`                                                              |
| Details page states (pending / error / not found), header actions | `.../compute/flavors/$flavorId.tsx`, `FlavorDetailsView.tsx`                               |
| Navigation entry, service card                                    | `client/routes/_auth/projects/-components/buildNavSections.ts`, `.../$projectId/index.tsx` |

## Known anti-patterns (don't copy)

Not a rule tier — concrete existing mistakes. If **new** code copies one, raise the matching Juno/epic finding; in untouched code it's Info under "Pre-existing".

| Anti-pattern                                                   | Where (at time of writing)       | Correct                                                                     |
| -------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `Pagination pages={…}`                                         | Flavors, Routers list containers | `totalPages` — `pages` is a backward-compat fallback (`juno-ui-components`) |
| Mixed empty-value dashes (`–` vs `—`) between list and details | Routers                          | One consistent placeholder per view                                         |
| Details tab state in `useState` instead of a URL param         | Routers details                  | Keep tab state in the route's search param                                  |
