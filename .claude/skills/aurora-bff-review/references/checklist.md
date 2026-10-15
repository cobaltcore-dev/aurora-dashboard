# Analysis checklist

Work through the steps in order. For each check, either record a finding or note it as verified OK; a short line in the report's "Verified OK" section is enough. A check that couldn't be done (e.g. docs unavailable) is recorded as "not verified" with the reason.

## 1. Prepare

- [ ] Run `scripts/init_findings_dir.sh`.
- [ ] Record `git rev-parse --short HEAD`, the base ref and the confirmed file list.
- [ ] Read every in-scope file completely. Don't review from the diff alone; the context matters.

## 2. Requirements traceability (epic)

- [ ] Extract each explicit requirement into `REQ-NN`, with its epic section (quote the key phrase) and priority. Typical sources are the "API Integration Mapping" tables, "Acceptance Criteria", "Subtasks", and the "Permissions" and "Request Flow" sections.
- [ ] For each requirement, record its status: **Implemented**, **Partial**, **Missing**, **Out of Scope** (the epic or the user excludes it from this change; cite where) or **Unclear** (→ Open Question).
- [ ] Missing or Partial requirements that are in scope become findings (category `Requirements`).
- [ ] Also flag the reverse: implemented behaviour that the epic **forbids or contradicts**. A procedure or field that the epic doesn't mention isn't automatically wrong; list it as Info only if it adds risk.

## 3. API conformance (official docs)

For every procedure, compare against the endpoint docs (`openstack-sources.md`):

- [ ] HTTP method and path (version prefix, sub-resource and action paths such as `/add_router_interface`).
- [ ] Path IDs pass through `validateAndEncodeResourceId`.
- [ ] Query parameters: only documented filters and sort keys are forwarded, with the correct names (`tags-any`, not `tags_any`), types and multi-value form. BFF-side parameters (e.g. `searchTerm`) are **not** forwarded.
- [ ] Request body: the correct wrapper key, documented field names, no undocumented or read-only fields. Optional fields are sent only when set. `project_id`/`tenant_id` are only sent where the API and the epic require them.
- [ ] Response handling: the correct envelope key and the expected status (e.g. `204` for delete; no body parse on `204`).
- [ ] Documented error codes per endpoint are handled. Check especially 400, 401, 403, 404, 409, 412 and 413/409 for quota.

## 4. Schemas (Zod)

- [ ] Response schemas match the documented fields and types.
- [ ] Fields that are optional or extension-dependent in the docs are `.optional()` / `.nullable()` as documented. Admin-only fields (policy) are optional.
- [ ] Strict enums are only used for value sets the docs guarantee. Unknown values from OpenStack must not break a list parse.
- [ ] Input schemas: required vs optional matches the API and the epic. Formats are validated where the epic or the API constrains them (IP, CIDR, MAC, UUID, lengths). "Exactly one of" constraints use refines. Sort keys are limited to the documented ones.
- [ ] Inputs extend `projectScopedInputSchema` (or the module's equivalent).
- [ ] Exported types are inferred from schemas, not duplicated by hand.

## 5. Error handling

- [ ] **Every OpenStack call is wrapped** so that `SignalOpenstackApiError` is translated (e.g. `requestOrThrow`). A bare `if (!response.ok)` after a request is dead code. Classify it **High**: the specific error mapping never runs, and users get a 500 instead of a 403/404/409.
- [ ] Each procedure is wrapped in `withErrorHandling(..., "<operation>")`.
- [ ] Status → tRPC code mapping uses the module's shared handler (Network: `ErrorHandler("<Resource>", overrides)`). Overrides exist where the docs or the epic define resource-specific meanings (e.g. 409 "in use" on delete, quota).
- [ ] Error messages are user-friendly and don't leak internals. They include the OpenStack message where useful.
- [ ] Best-effort lookups don't fail the whole procedure, and they distinguish "none" from "unknown".

## 6. Security and scoping

- [ ] Project-scoped procedures use `projectScopedProcedure`. Lists filter by the current `project_id`, unless the epic says otherwise.
- [ ] Ownership comes from the session (rescoped token), not from client input, for create operations.
- [ ] No unvalidated user input reaches URLs, bodies or headers. Body fields are explicitly allow-listed (no spreading of raw input).
- [ ] Permission requirements from the epic (e.g. `network:<resource>:*`) are covered: the server enforces them, or the epic's rule is that OpenStack enforces them. Check that the permission router has the keys the epic references.

## 7. Enrichment and performance

- [ ] Data the epic's UI needs that isn't in the resource object (e.g. names of related resources) is resolved in the BFF, not by N calls from the client.
- [ ] Lookups are batched for the whole list (`?id=a&id=b`), chunked for long ID lists, and skipped when there's nothing to look up. There are no per-item requests in loops.
- [ ] `fields=` is used where only a few fields are needed.

## 8. Conventions (same module)

- [ ] File layout and naming match the module (types / helpers / routers / tests; namespace registered in `routers/index.ts`).
- [ ] The router header JSDoc lists each procedure with its method and endpoint.
- [ ] Shared helpers are reused rather than duplicated. A helper copied from another resource should have been extracted into a shared module.
- [ ] `parseOrThrow` context strings are `"<router>.<procedure>"`.

## 9. Tests

- [ ] Each procedure has tests for: the success result; the exact URL, query and body sent; input validation rejected **before** any call; invalid session; missing service; parse error; and each mapped OpenStack error.
- [ ] **Error tests simulate the real client:** the mock rejects with `new SignalOpenstackApiError(message, status)`. Tests that return `{ ok: false }` responses only exercise dead code and hide the real behaviour. Classify that as High when paired with a dead `.ok` check.
- [ ] Schemas: required, optional and nullable fields, enums, refines, validators.
- [ ] Helpers: overrides, quota detection, shaping functions, edge cases (empty input, fallbacks).
- [ ] Enrichment: batching, chunking, fallbacks, no requests when nothing needs looking up.
- [ ] Review the tests **statically**: read them and judge coverage and correctness. Don't run them (see "No tooling runs" in `SKILL.md`).

## 10. Docs

- [ ] A BFF doc exists in `packages/aurora/docs/` (if the epic or the repo convention requires one) and matches the code: procedure names, parameters, error tables, response types, enrichment behaviour.
- [ ] Statements in the doc are true for the current code. Copy-pasted outdated content (e.g. `protectedProcedure`) is a finding.
