# Baseline: how the server code is built

Judge new code against the conventions of **its own module**. The facts below come from the repository at the time this skill was written. **Re-check them** (grep, read the files) before relying on them, because the code evolves.

## Repo-wide facts

| Fact                                                                                                                                                                                             | Where                                                                                    | Why it matters                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| signal-openstack **throws** `SignalOpenstackApiError(message, status)` for every non-2xx response; it never returns a non-ok response                                                            | `packages/signal-openstack/src/client.ts`                                                | `if (!response.ok) { throw handler(response) }` is dead code. The specific error mapping never runs                                                 |
| `withErrorHandling` keeps `TRPCError`s, maps `SignalOpenstackError` (validation) to `BAD_REQUEST`, and maps **everything else**, including `SignalOpenstackApiError`, to `INTERNAL_SERVER_ERROR` | `packages/aurora/src/server/helpers/errorHandling.ts`                                    | Without a translation step, an OpenStack 403/404/409 reaches the UI as a 500                                                                        |
| `requestOrThrow(request, handler, label)` catches `SignalOpenstackApiError` and turns it into the resource-specific `TRPCError`                                                                  | `packages/aurora/src/server/Network/helpers/` (routerHelpers or a shared request helper) | This is the reference pattern for correct error mapping in Network                                                                                  |
| `projectScopedProcedure` requires `project_id` in the input and rescopes the session to it; it also forwards `ctx.signal`                                                                        | `packages/aurora/src/server/trpc.ts`                                                     | Project-scoped resources must use it. A list should also _filter_ by `project_id`, so admin roles don't see other projects' items in a project view |
| `validateAndEncodeResourceId` validates and encodes every ID used in a URL path                                                                                                                  | `@cobaltcore-dev/signal-openstack`                                                       | A raw ID interpolated into a path is a path-injection risk                                                                                          |
| `appendQueryParamsFromObject(obj, { keyMap })` builds query strings; arrays become repeated keys                                                                                                 | `server/helpers/queryParams.ts`                                                          | `keyMap` maps names like `tags_any` → `tags-any`                                                                                                    |
| `parseOrThrow(schema, data, "<router>.<procedure>")` parses responses with Zod and throws `PARSE_ERROR` with context                                                                             | `Network/helpers/index.ts`                                                               | Responses should be validated, not cast                                                                                                             |
| Request cancellation: `ctx.signal` can be passed to service calls                                                                                                                                | `packages/aurora/docs/0016_abort_signal_propagation.md`                                  | Required where the module or the epic uses it (mainly long-running Storage operations); otherwise optional                                          |

## Repo review rules

`.github/copilot-instructions.md` Part A.2 (tRPC) applies to the BFF:

- requests are type-safe through tRPC;
- tRPC errors are handled gracefully;
- each procedure uses the correct procedure type (e.g. `protectedProcedure` for authenticated routes, `projectScopedProcedure` for project resources).

Don't report what tooling enforces (formatting, general type errors, lint rules). The review doesn't run the tooling either; CI and the remediation skill's verification cover it.

## Per-module conventions

Re-derive these with a quick survey before reviewing:

```bash
cd packages/aurora/src/server
grep -c "projectScopedProcedure\|requestOrThrow\|\.ok\b\|ErrorHandler\|withErrorHandling\|parseOrThrow" <Module>/routers/*.ts
```

At the time of writing:

| Module                  | Error handling                                                                                                                                                                                                       | Notes                                                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Network                 | Shared `ErrorHandler("<Resource>", overrides)` in `Network/helpers/errorHandling.ts`, with `requestOrThrow` in `routersRouter`. Other routers (floating IPs, security groups, RBAC) still use the dead `.ok` pattern | `routersRouter.ts` + `routerHelpers.ts` + `types/router.ts` are the most complete reference (enrichment, batching, error mapping, tests) |
| Compute                 | Per-resource helpers (e.g. `flavorHelpers`, `imageHelpers`); `imageRouter` uses `.ok` checks and catches `SignalOpenstackApiError` in places                                                                         | Check the closest Compute router for the new resource                                                                                    |
| Storage                 | Separate clients (`Storage/clients`), a Ceph procedure (`cephProcedure.ts`), middleware                                                                                                                              | Different structure; don't apply Network patterns                                                                                        |
| Authentication, Project | `protectedProcedure` (not project-scoped)                                                                                                                                                                            | Expected for session- and domain-level operations                                                                                        |

**Pre-existing issues** such as the dead `.ok` checks in existing routers are out of scope. Report them only in "Pre-existing / Out of Scope" (Info), and only if they're relevant to the reviewed changes, e.g. when the new code copied the pattern.

## Docs

- BFF docs: `packages/aurora/docs/NNNN_<resource>_bff.md`. The best structure reference is `0010_routers_bff.md`.
- Older docs (e.g. `008_floating_ips.md`) can describe outdated details (`protectedProcedure`, old route paths). The docs must match the code that is under review.
