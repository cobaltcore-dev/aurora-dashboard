# Business Requirements Document: Project Role Assignments

## Document Control

| Field                                             | Value                                 |
| ------------------------------------------------- | ------------------------------------- |
| Feature                                           | Project Role Assignments              |
| Date                                              | 2026-11-27                            |
| Status                                            | Draft — not engineering-ready         |
| Target                                            | Aurora Dashboard, using Juno          |
| Repository                                        | `/Users/I539132/git/aurora-dashboard` |
| First release                                     | Read-only scope below                 |
| Submitted by, owner, team, priority, release date | ⚠️ Still needed                       |

Confirmed requirements come from stakeholder discussion, corrected on 2026-11-27: **read-only, not full CRUD**. This supersedes the earlier assignment-management scope. Technical proposals and unresolved dependencies are explicitly identified. This document does not authorize implementation or unrelated navigation changes.

## 1. Summary

Rebuild and redesign the read-only portion of the existing Authorizations functionality in Aurora. Appropriately authorized users must be able to inspect project access and role assignments for existing users and groups. No create, update, grant, revoke or delete operations are in scope.

Distinguish directly assigned roles from access gained through groups, inheritance, and role implications.

## 2. Business Justification

The stated goal is modernization and migration of the existing functionality. The stakeholder is not currently a user and has no specific complaints. Do not invent usability problems, business impact, or research findings.

Expected capability: inspect project roles while making assignment sources explicit and identity information accessible.

⚠️ Still needed: business sponsor, measurable success criteria, and consequences of not delivering.

## 3. Target Surface

Aurora Dashboard within the selected project context. The screenshots establish the current functionality, not a requirement to reproduce the layout.

Confirmed placement: add **Project Role Assignments** after **Key Manager** under the existing **Authorization** navigation without reorganizing other entries. Main route: `/projects/$projectId/authorization/role-assignments`; tabs: Users, Groups, Roles. User/group detail routes remain to be specified.

## 4. Out of Scope / Non-Goals

- Adding, editing, granting, revoking or removing project role assignments, including self-removal.
- Assignment editors, principal pickers, change previews, removal confirmations and write-outcome handling.
- Domain- and system-scoped assignment management.
- Creating, editing, or deleting role definitions.
- Creating, editing, disabling, or deleting users/groups.
- Group-membership management.
- Bulk operations across multiple users/groups.
- Creating or changing inherited assignments.
- Computing service permissions from role names.

Reading the origin of inherited access does not put domain management in scope.

## 5.1 User Stories

Personas describe permitted capabilities, not hardcoded Keystone role names.

| Persona           | Capabilities                                                    |
| ----------------- | --------------------------------------------------------------- |
| Authorized reader | Inspect lists, identity details, role sources, and role catalog |

### BR-01 — Inspect Project Assignments

As an authorized reader, I want to inspect users and groups with project roles so that I can understand project access.

- [ ] Provide **Users**, **Groups**, and **Roles** tabs.
- [ ] Show identity names, IDs, and project roles in assignment lists.
- [ ] Distinguish direct assignments from indirect roles.
- [ ] Support name/ID search and role filtering in assignment lists.
- [ ] Support C/D/I-number search only where verified identity data supports it.
- [ ] Distinguish loading, no data, no search results, access denial, and request failures.

### BR-02 — Understand Assignment Sources

As an authorized reader, I want to understand how a user receives a role so that I can distinguish direct assignments from indirect access.

- [ ] Identify direct project grants.
- [ ] Show sources for group-derived/inherited roles where the API provides them.
- [ ] Include role implications in effective roles where Keystone returns them.
- [ ] Do not present incomplete source data as complete.
- [ ] Keep all assignments read-only, including direct grants.
- [ ] Do not claim that effective roles enumerate all permitted service actions; service policies remain authoritative.

### BR-03 — Inspect Identity Details

As an authorized reader, I want read-only user/group details so that I can inspect identities and their project-role sources.

- [ ] Provide read-only user and group detail views.
- [ ] Show identity information and project roles with their sources.
- [ ] Make the object's own ID copyable in its detail view.
- [ ] Link related identities only to valid, authorized destinations.
- [ ] Do not combine links with copy controls.
- [ ] Exclude identity editing and membership management.

BR-04 (assignment management) and BR-05 (self-removal) are withdrawn from scope. Their IDs remain reserved to avoid renumbering the surviving requirements.

### BR-06 — Inspect Role Definitions

As an authorized reader, I want a read-only role catalog so that I can identify role definitions.

- [ ] Display role names and IDs.
- [ ] Provide no role-definition write actions.
- [ ] Display Service and Access Level only from verified metadata.
- [ ] Never infer permission descriptions by parsing role names.

## 5.2 Required User Actions

Readers: browse tabs, search/filter assignments, inspect identity details and role sources, copy own-object IDs in details, and inspect role definitions.

No assignment-management actions, write endpoints or permission probes are required.

## 6. Release Scope & Prioritization

BR-01, BR-02, BR-03 and BR-06 form the read-only first-release target. Assignment CRUD is excluded, not a required follow-up phase.

## 7. API Information

Service: Keystone, OpenStack Identity API v3. Feature requests are GET-only; no grant/revoke contracts are exposed by the BFF.

| Capability          | Documented API                                          |
| ------------------- | ------------------------------------------------------- |
| List assignments    | `GET /v3/role_assignments`                              |
| Direct user grants  | `GET /v3/projects/{project_id}/users/{user_id}/roles`   |
| Direct group grants | `GET /v3/projects/{project_id}/groups/{group_id}/roles` |
| Identity details    | `GET /v3/users/{user_id}`, `GET /v3/groups/{group_id}`  |
| Role catalog        | `GET /v3/roles`                                         |

Authentication: Aurora's server-side OpenStack session; Keystone requests use `X-Auth-Token`. Actual token scope must be verified per endpoint. Project-level product scope does not prove that every endpoint accepts project-scoped tokens.

Upstream v3 contracts are documented. Deployed capabilities, QA readiness, catalog discovery configuration, endpoint availability, collection completeness, rate limits, and identity-search support remain unverified.

⚠️ Still needed: QA endpoint/region/test project, access process, seed data, token lifetime expectations, deployed API version/capabilities, throttling, and deployment-specific error handling.

## 8. Non-Functional Requirements

### Authentication & Authorization

- Keystone remains authoritative for every read.
- Keystone evaluates listing and identity lookup permissions independently on each actual request.
- **Confirmed authorization approach:** Aurora checks the authenticated session, validates inputs and enforces the project-only application contract. It does not duplicate deployed Keystone authorization rules in a local Identity policy engine or permission router.
- Read refusals remain scoped to the affected content. Successful reads do not imply write permission; no write actions or write-permission preflights exist in this feature.
- Verify target-dependent Keystone enforcement in QA; do not substitute a global role-name gate or treat fixture policies as deployment proof.
- Do not broaden directory visibility merely to populate an identity picker.
- Do not expose tokens or credentials in errors/logs.
- Failed or incomplete retrieval must not be presented as no assignments.

### UI and Accessibility

Follow `docs/guardrails/guardrails.md`, shared project memory, and installed Juno guidance. Use existing UI components where appropriate. Preserve accessible labels, keyboard operation, focus management, and meaningful state feedback.

Detailed Juno component/prop mapping is pending; these drafts do not claim that review has been completed.

### Dependencies

⚠️ Still needed: Identity/platform contact, endpoint/token-scope and target-dependent authorization verification, metadata sources, security approval, performance targets, and analytics/audit requirements. Local Identity policy mappings are not required under the confirmed authorization approach. Route/navigation placement was approved during stakeholder discussion (§3).

The repository's `.github/CODEOWNERS` lists `@cobaltcore-dev/frontend`; no dedicated Identity/Keystone contact was found.

## 9. Rollout & Support

⚠️ Still needed: rollout mechanism, responsible team, support ownership, go-live communication, and dependency timelines.

## Specifications

- [Engineering specification and epic index](project-role-assignments-spec.md)
  - [T-01: Assignment Lists and Role Catalog](project-role-assignments-spec.md#t-01-assignment-lists-and-role-catalog)
  - [T-02: Read-Only Identity Details](project-role-assignments-spec.md#t-02-read-only-identity-details)

## References

- `/Users/I539132/Desktop/Bildschirmfoto 2026-11-26 um 10.47.13.png` — user assignments.
- `/Users/I539132/Desktop/Bildschirmfoto 2026-11-26 um 10.47.18.png` — group assignments.
- `/Users/I539132/Desktop/Bildschirmfoto 2026-11-26 um 10.47.25.png` — role information.
- [Identity API v3](https://docs.openstack.org/api-ref/identity/v3/)
- [Group assignments on a domain](https://docs.openstack.org/api-ref/identity/v3/#list-role-assignments-for-group-on-domain) — contextual reference; domain management is out of scope.
- [Keystone administration — Pike](https://docs.openstack.org/keystone/pike/admin/cli-manage-projects-users-and-roles.html) — historical guidance, not proof of current deployment behavior.
- [OpenStackClient 2025.2 role assignments](https://docs.openstack.org/python-openstackclient/2025.2/cli/command-objects/role-assignment.html)
