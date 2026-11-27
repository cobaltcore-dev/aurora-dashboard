# Epic: Project Role Assignments

Source BRD: [project-role-assignments-brd.md](project-role-assignments-brd.md)
Target surface: Aurora Dashboard — selected project context, under existing **Authorization** navigation
Status: **Draft — not engineering-ready**
Epic and implementation issues: not created

This specification consolidates the T-01, T-02 and T-03 drafts. It is a discussion and implementation-planning document, not a record of production completion. A PoC does not settle open decisions or satisfy deployment acceptance criteria.

## Epic Index

| Ticket | Title                             | BRD coverage        | Dependencies                                              |
| ------ | --------------------------------- | ------------------- | --------------------------------------------------------- |
| T-01   | Assignment Lists and Role Catalog | BR-01, BR-02, BR-06 | Endpoint/scope, complete-data and provenance verification |
| T-02   | Read-Only Identity Details        | BR-02, BR-03        | T-01 queries and source normalization                     |
| T-03   | Direct Assignment CRUD            | BR-04, BR-05        | T-01; T-02 for detail entry points                        |

```text
API, token-scope and data-completeness verification
└─ T-01: Users / Groups / Roles lists
   ├─ T-02: Read-only identity details
   └─ T-03: Direct assignment CRUD
      └─ Detail entry points depend on T-02
```

All three tickets form the confirmed first-release target. A separate read-only release was not selected. Create an epic and link these ticket sections from its implementation issues; BRD and spec remain versioned repository documents, not substitutes for issue tracking.

## Confirmed Decisions

- Project context only. No domain/system assignment management, identity CRUD, membership management or role-definition writes.
- Add **Project Role Assignments** after **Key Manager** in the existing **Authorization** section; do not reorganize existing navigation.
- Main route: `/projects/$projectId/authorization/role-assignments`. User/group detail destinations still need definition and project-relationship validation.
- **Users**, **Groups**, **Roles** are distinct datasets, each with its own DataGrid under page-level tabs.
- One existing user or group per form, with multiple direct roles. Exact-ID lookup is accepted for Add; no unrestricted directory listing is required.
- Indirect/effective roles remain read-only and show available provenance. Own-object IDs are copyable only in identity details, never combined with navigation links.
- **Keystone authorizes every actual read, lookup, grant and revoke.** Aurora validates session, inputs and the project-only application contract; it does not duplicate deployed Identity policy rules in a local engine or permission router.
- **Accepted trade-off:** assignment actions may be offered without local write-permission preflight. Keystone may reject individual operations with 403. Successful reads never imply write permission; retain confirmed successes and explain refusals per operation.
- No trial grants/revokes for permission discovery, automatic privilege escalation, automatic mutation retry or hardcoded role-name gates.
- Service, Access Level and C/D/I-number fields/search require verified metadata. Their absence does not block the feature; omit unsupported fields rather than infer them.

## Shared Implementation Constraints

### BFF, Authentication and Authorization

Keystone access, response validation, normalization and mutation orchestration belong in the BFF. Keep credentials and raw tokens out of the browser, logs and returned errors.

Existing infrastructure:

- `packages/aurora/src/server/trpc.ts`: authenticated and token-rescoping procedures.
- `packages/aurora/src/server/routers.ts`: base-router registration.
- `packages/aurora/src/server/context.ts`: current server-side OpenStack session and configured Identity endpoint.
- `packages/aurora/src/server/policies/createPermissionRouter.ts`: existing generic factory, **not required** for this feature's Keystone-authorized approach.

Actual endpoint token scopes require deployment verification. Product scope does not prove that `projectScopedProcedure` is appropriate for every Identity endpoint. The existing project route selects project context; if Identity rejects that token, approve a separate session strategy instead of silently changing scope.

Explicitly filter assignment requests to the selected project. Cache by project, principal and direct/effective mode as appropriate; never leak results across scopes. An assignment-list read does not authorize identity-directory lookup. Keystone independently decides each request, and the BFF must enforce the approved project/principal relationship for detail deep links.

Policy fixtures are examples, not production configuration. No local policy mapping is required, but QA must verify allowed and denied endpoint/target combinations with the intended token scopes.

### Data Completeness and Provenance

- Do not treat failed retrieval as an empty collection or no access.
- Verify collection completeness before searching/filtering or making complete-access claims. Do not invent Keystone offset, total-count or directory-search parameters.
- Groups come from non-effective group assignments, never from effective user expansion.
- Preserve separate sources when the same role is direct and group-derived, inherited, or implied. Exact duplicates may collapse visually; distinct origins must remain available.
- Assignment/membership links are provenance inputs, not automatically valid Aurora navigation destinations. Do not expose raw Keystone URLs as application links.
- Unknown sources and incomplete implication chains must be labeled incomplete; do not infer editable direct grants from effective roles.
- Effective roles do not enumerate all permitted service actions. Service policies remain authoritative.

### UI, States and Accessibility

Follow `docs/guardrails/guardrails.md`, shared project memory and installed Juno guidance. Existing Aurora features are structural references, not UI/UX authority. Detailed Juno component/prop mapping remains pending.

- Persistent input labels, keyboard-operable tabs/forms/navigation and announced loading/error/outcome states.
- DataGrid page size 30; pagination only for multiple pages, using verified count precision.
- Distinguish loading, no data, no matches, incomplete data, access denial and request failures.
- Scope read/render errors to the affected dataset or section; preserve other authorized content where feasible.
- Use existing AuthProvider/session-expiry behavior; keep **Session Expired** for 401. No feature-specific sign-in restart flow.
- CRUD failures are persistent, actionable feedback near the operation. Do not use color alone to distinguish sources or outcomes.
- No copy controls in lists; own-object IDs in details copy the ID, not the name. Never combine navigation links and copy controls.

## T-01: Assignment Lists and Role Catalog

### User Story

As an authorized reader, I want searchable project assignment lists and a read-only role catalog so that I can inspect access and identify roles.

### Acceptance Criteria

- [ ] Users, Groups and Roles have distinct datasets under their respective tabs.
- [ ] Assignment rows show identity name/ID and project roles; Users include direct and effective information.
- [ ] Groups display group grants independently of effective user expansion.
- [ ] Group-derived, inherited and implied roles show verified available origins and remain read-only as indirect grants.
- [ ] Duplicate effective roles may be grouped visually without losing distinct sources.
- [ ] Name/ID search and role filtering operate on complete collections; C/D/I-number search is conditional on verified identity data.
- [ ] Role catalog contains names/IDs, no role-definition writes and only verified optional metadata.
- [ ] Denied reads show permission feedback, not empty data. Successful reads never imply write permission.
- [ ] Loading, empty, filtered-empty, incomplete, forbidden and error states are distinct.

### Flow and UI

Open the selected project → inspect Users → search/filter → open an available identity detail → switch to Groups or Roles without changing project context. Lists use the mandatory DataGrid pattern, with name/ID, roles/sources and relevant row actions. Exact component composition and props remain subject to Juno review.

### API Contracts

```http
GET /v3/role_assignments?scope.project.id={project_id}&include_names=true
GET /v3/role_assignments?scope.project.id={project_id}&effective&include_names=true
GET /v3/roles
```

No request body. Assignment reads return `200` with `role_assignments` and collection `links`; role catalog returns `200` with `roles` and collection links. Documented assignment filters include `role.id`, `user.id` and `group.id`.

Effective mode accounts for group membership, inheritance and role inference; group assignment entities are not returned as group rows. Global/domain-specific role-definition visibility and applicability to the current project need verification; reading definitions is not domain assignment management.

### States and Edge Cases

Request/refetch → Loading → Success / Empty / Incomplete / Forbidden / Error. Search with no results is Filtered Empty, with a clear-filters action. Missing provenance is explicit even when the collection itself is complete.

Cover indirect-only users, direct plus multiple group sources, duplicate/missing names, inaccessible/deleted identity details, inherited group origins absent from direct queries, incomplete implications and large or changing effective expansions. Avoid per-row request waterfalls and unbounded identity/group expansion.

## T-02: Read-Only Identity Details

### User Story

As an authorized reader, I want identity details and project-role sources so that I can understand a selected principal's access.

### Acceptance Criteria

- [ ] Open the selected user/group within the current project context.
- [ ] Show identity name and own ID; copying copies that ID without triggering navigation.
- [ ] Distinguish direct and indirect roles and show available origins with explicit incompleteness feedback.
- [ ] Show only approved returned identity attributes; no identity editing or membership management.
- [ ] Related-object links exist only for valid, authorized application destinations.
- [ ] Identity and role-section failures are independent where feasible.
- [ ] Deep links validate the project/principal relationship before arbitrary directory records can be read.

### Flow and UI

Open from an assignment list → load identity and role sources → inspect direct/indirect access → copy own ID → return to assignments. Use a read-only DescriptionList and Aurora's existing ClipboardText pattern for the own ID. Exact detail routes, additional fields and source composition remain open.

### API Contracts

```http
GET /v3/users/{user_id}
GET /v3/groups/{group_id}
GET /v3/projects/{project_id}/users/{user_id}/roles
GET /v3/projects/{project_id}/groups/{group_id}/roles
GET /v3/role_assignments?scope.project.id={project_id}&user.id={user_id}&effective&include_names=true
```

No request body. Identity reads return `200` with `user` or `group`; direct-role reads return `200` with `roles` and collection links. Direct-role endpoints are not complete indirect-access queries. Group inheritance/source retrieval needs separate verification.

### States and Edge Cases

Request/refetch → Loading → Success / No Project Roles / Partial / Forbidden / Missing / Error. Keep available role data when identity lookup is denied, and vice versa where possible. Retry only the affected section.

Cover deletion after list retrieval, denied directory lookup despite visible assignments, indirect-only principals, duplicate/long/missing names, unrelated deep-linked principals and unavailable source records. Reuse authorized caches safely; avoid recursive directory expansion.

## T-03: Direct Assignment CRUD

### User Story

As an authorized assignment manager, I want to add, change or remove direct roles for one existing principal so that I can manage project access.

### Acceptance Criteria

- [ ] Each form targets exactly one existing user/group; Add uses accepted exact-ID lookup and requires one or more roles.
- [ ] Edit starts from current direct grants; indirect access is separate and read-only.
- [ ] Unchanged grants cause no mutation; additions/removals are summarized before submission.
- [ ] Removal is explicitly confirmed and explained as assignment removal, not identity/role deletion; indirect access may remain.
- [ ] Self-removal has additional explicit confirmation and warns of possible project/management access loss.
- [ ] Keystone independently authorizes every actual grant/revoke; no local write-permission preflight is required.
- [ ] Report succeeded, failed and uncertain outcomes per role. Submission alone is not success.
- [ ] Retry reads current grants, reconciles intent and reviews remaining changes before resubmission.
- [ ] No atomic multi-role update, automatic rollback, privilege escalation or automatic mutation retry is claimed.

### Flow and UI

Open Add/Edit → load identity, applicable roles and direct grants → select desired direct roles → review changes → confirm removal/self-removal → submit individual operations → show outcomes and refresh affected data.

The form uses one existing principal and multiple roles, with indirect roles read-only. Review summarizes additions/removals. Destructive confirmation follows mandatory Aurora guardrails. Exact form components, confirmation severity and outcome composition remain open.

### API Contracts and BFF Calculation

```http
PUT /v3/projects/{project_id}/users/{user_id}/roles/{role_id}
DELETE /v3/projects/{project_id}/users/{user_id}/roles/{role_id}
PUT /v3/projects/{project_id}/groups/{group_id}/roles/{role_id}
DELETE /v3/projects/{project_id}/groups/{group_id}/roles/{role_id}
```

No request body. Confirmed success is **204 No Content**. Documented grant errors: 400/401/403/404/409; revoke errors: 400/401/403/404. No assignment PATCH or atomic multi-role transaction exists in these contracts.

```text
additions = desired direct roles − existing direct roles
removals  = existing direct roles − desired direct roles
```

Validate one principal, current project and unique role IDs. Recheck current direct grants sufficiently to avoid overwriting concurrent changes. Each write carries the explicit project/principal/role target and a verified token scope; Keystone evaluates its deployed policy on that request. Preserve independent outcomes and do not silently undo confirmed successes.

Snapshot/concurrency strategy, operation ordering, bounded execution and exact BFF schemas remain proposals. The PoC's ordering or limits do not decide them.

### States and Edge Cases

Loading → Editing → Reviewing → Submitting → Success / Partial Failure / Failure / Outcome Unknown.

Retry → Reconcile Current State → Review Remaining Changes. Reconciliation must not bypass removal confirmation when the removal set changes. A timeout/disconnect may occur after Keystone applies a change; do not blindly replay the batch.

Cover changed permissions, concurrent edits, deleted principal/role, timeout after apply, group-member impact, self-removal denying later requests, remaining indirect access, temporarily stale tokens/caches, empty desired roles, duplicate selection and unchanged selection. Do not promise continued access, last-administrator protection or immediate token invalidation.

## Error Handling Across Tickets

| Failure                          | Treatment and recovery                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 400 / validation                 | Field/form feedback; correct input. No misleading success.                                                                                  |
| 401                              | Existing AuthProvider/session-expiry flow; reconcile before retrying writes after authentication.                                           |
| 403 read                         | Permission feedback for the affected dataset/section; preserve other authorized content.                                                    |
| 403 write                        | Accepted per-operation refusal; retain confirmed successes, preserve intent and review current state. No automatic retry/escalation.        |
| 404                              | Missing/not-accessible feedback. For a write, determine what disappeared and reconcile; DELETE 404 is not automatically successful removal. |
| 409                              | Explain conflict; refresh/reconcile and review before retry.                                                                                |
| Network/timeout                  | Manual retry for reads; unknown write outcome requires reconciliation first.                                                                |
| 5xx / render failure             | Scoped error with retry where feasible; retain confirmed write outcomes.                                                                    |
| Incomplete collection/provenance | Explicit limitation, never empty/success masquerading as completeness.                                                                      |

## Open Items and Verification

- **O-01:** Verify endpoint/token-scope compatibility and Keystone allowed/denied behavior for reads, lookup and target-dependent grants/revokes. No local Identity policy evaluator is required.
- **O-02:** Complete retrieval, count precision, search/filter contracts and collection limits.
- **O-03:** Source normalization, group inheritance and implication provenance.
- **O-04:** Optional Service/Access Level/C/D/I-number metadata sources; omit unverified fields.
- **O-05:** Juno component/prop mapping, identity detail routes/fields, authorized related-object destinations and deep-link relationship validation.
- **O-06:** Verify exact-ID lookup visibility and eligible-role contract. No unrestricted directory picker.
- **O-07:** Mutation schemas, operation ordering, concurrency/snapshots, bounds, deadlines, reconciliation semantics and confirmation severity.
- **O-08:** Session/cache behavior after self-removal, QA project/access/fixtures, performance/rate limits, rollout and security/audit ownership.

Tests must cover direct/indirect/implied roles and multiple sources, incomplete collections/provenance, allowed/denied independent Keystone operations, project relationships, partial failures, timeout reconciliation, concurrent changes and self-removal. Run relevant tests, typecheck and lint for implementation PRs; mock tests do not establish deployment readiness.

Analytics/audit event schemas, privacy requirements and performance budgets remain undefined. No client-side analytics or mutation audit implementation is approved. Read/write requests and expansion must be bounded by approved limits, without claiming unlimited concurrency.

See [BRD references](project-role-assignments-brd.md#references) for source documentation.
