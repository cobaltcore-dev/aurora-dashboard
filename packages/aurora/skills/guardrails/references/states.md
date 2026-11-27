# State guardrails — loading, empty, error

Rules for loading, empty, and error states. IDs are stable; the `[scope: …]` tag is migration metadata only — every rule is binding. See [../SKILL.md](../SKILL.md) for the scope legend.

- **STATE-1** `[scope: design-system]` Use `Status` as the default for any loading, empty, or error state not covered by a more specific pattern (app / page / section / DataGrid level). DataGrid state rows are owned by the datagrid skill.
- **STATE-2** `[scope: design-system]` Never render nothing: always communicate the state and, where feasible, a course of action (e.g. a retry link).
- **STATE-3** `[scope: design-system]` Distinguish empty reasons: "no data yet" → suggest creating; "no filter/search results" → suggest clearing filters; error → show the error, not an empty state.
- **STATE-4** `[scope: design-system]` Loading: always show activity; scope it to the tightest sensible boundary (one indicator per busy scope — e.g. one on the DataGrid, not one per row); always allow it to time out.
- **STATE-5** `[scope: design-system]` Transient/progress: atomic controls (Button, Select, ComboBox) use their built-in busy state (and disable while busy); views/sections use `Spinner`; use `ProgressBar` only when a batch operation's percentage is expressible.
- **STATE-6** `[scope: aurora]` Handle errors by category:

  | Category                                   | Handling                                                                                                                               |
  | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
  | "Big" errors (500/502/503/504, 404, crash) | Full-page error view with code, title, description; keep the page header/navigation or at least a link home.                           |
  | 401 Unauthenticated                        | Redirect to Sign-in, remember the target, return after auth; show an auth error on the Sign-in page.                                   |
  | 403 Unauthorized (page)                    | Error page reflecting the route (breadcrumb + title), SideNav if applicable, plus an **info** `Message` explaining the lack of access. |
  | Component/API render error                 | Scope feedback to the affected component; render the rest of the page.                                                                 |
  | Operation/CRUD error                       | Non-blocking `Message` with detail; offer retry where feasible; use a toast only when no user action is required.                      |
  | Validation error                           | Inline per field, or a `Message` at form/section top for cross-field.                                                                  |
  | Network/connectivity                       | Clear offline/timeout state with a manual retry.                                                                                       |

- **STATE-7** `[scope: aurora]` Error copy is impersonal and exclamation-free — e.g. 401 "Authentication failed. Verify your credentials and try again."; 403 "You do not have the required permissions to access this resource."; 404 "The requested URL does not exist or may have moved."; 500 "An internal error occurred. Try again."
