---
name: create-service-bff
description: >-
  Scaffold the BFF (server) side of a new OpenStack service in Aurora: zod types,
  a project-scoped tRPC resource router that proxies OpenStack, a permission
  router, and registration into the base router. Use when the user says "build
  the BFF for X", "add the server side for service X", "create tRPC routes for X",
  or when create-service delegates the server side. Keeps business logic on the
  server so the UI stays dumb.
metadata:
  area: server
sources:
  - src/server/KeyManager/types/keyManager.ts
  - src/server/KeyManager/routers/keyManagerRouter.ts
  - src/server/KeyManager/routers/permissionRouter.ts
  - src/server/KeyManager/routers/index.ts
  - src/server/routers.ts
  - src/server/trpc.ts
---

Scaffold the server side of a new Aurora service under `src/server/<Service>/`. The
BFF is a Fastify + tRPC layer that proxies the OpenStack API and holds the business
logic, so the frontend stays dumb.

**Use an existing service only as a structural reference, never as content.** The
files in `sources` (KeyManager) show the _layout_ a service follows - which files
exist, how they fit together, and the shape of each file. Read them to learn the
pattern, then derive every service-specific detail (resources, fields, operations,
OpenStack endpoints, policy rules, error shapes) from the brief / epic. Do **not**
copy KeyManager's resources, fields, or rules into the new service.

**When the brief does not make a detail clear, ask the user a clarifying question -
do not guess and do not borrow the answer from the exemplar.** Typical gaps: exact
resource fields and which are nullable, the OpenStack endpoints/paths, pagination and
filter params, and the policy rule names.

## What you produce

For a service named `<Service>` (PascalCase dir, camelCase elsewhere), proxying an
OpenStack API with resources and operations given in the brief:

```
src/server/<Service>/
  types/<service>.ts            # zod schemas: one per resource + create/update inputs
  types/<service>.test.ts       # schema tests (valid + invalid cases)
  routers/<service>Router.ts    # build<Service>ResourceRouter(policyDir)
  routers/permissionRouter.ts   # build<Service>PermissionRouter(policyDir)
  routers/index.ts              # build<Service>Routers(policyDir)
  routers/<service>Router.test.ts
```

## Procedure

1. **Types** (`types/<service>.ts`). Define a `zod` schema per resource and per
   create/update input, following the KeyManager types _pattern_ (nullable fields
   where OpenStack may omit them, list schemas wrapping the item schema). Take the
   actual fields from the brief, not from KeyManager - if the fields or their
   nullability are unclear, ask. These schemas are the single source of truth for the
   shapes the UI consumes.

2. **Resource router** (`routers/<service>Router.ts`). Export
   `build<Service>ResourceRouter(policyDir)`. For each operation build a
   `projectScopedProcedure` (from `@/server/trpc`), extending the input with
   `projectScopedInputSchema.extend({ ... })`. In each handler:
   - call OpenStack through `@cobaltcore-dev/signal-openstack` (the context's client),
   - validate responses against the zod schema (see `parseOrThrow` usage),
   - enforce the matching policy rule server-side via a `loadPolicyEngine` guard
     (`@/server/policies`) - the client gate is advisory only, so Aurora must be
     authoritative here,
   - map OpenStack / HTTP errors to `TRPCError` with the right code, following
     KeyManager's error-mapping _approach_ (surface the upstream reason when present).

3. **Permission router** (`routers/permissionRouter.ts`). Export
   `build<Service>PermissionRouter(policyDir)`: a `MAPPINGS` table of
   `"<service>:<resource>:<op>"` to `{ engine, rule }`, passed to
   `createPermissionRouter` (from `@/server/policies/createPermissionRouter`). This
   powers the client's `canUser` checks.

4. **Index** (`routers/index.ts`). Export `build<Service>Routers(policyDir)` returning
   `{ <service>: auroraRouter({ ...resourceRouter, ...permissionRouter }) }` - one
   namespace key the client calls as `client.<service>.*`.

5. **Register** in `src/server/routers.ts`: import `build<Service>Routers` and add
   `auroraRouter(build<Service>Routers(policyDir))` to `buildBaseRouter`'s `mergeRouters`.

6. **Tests**. Add colocated `*.test.ts` (vitest) for the router handlers (mock the
   policy engine like `keyManagerRouter.test.ts` does) and the zod schemas.

## Rules

- Business logic and data shaping live here, never in the UI. If the UI would need to
  transform or orchestrate OpenStack data, do it in the handler instead.
- Every mutating operation is policy-guarded server-side.
- Keep it generic: derive resources, operations, fields and policy rules from the
  brief / epic. Never hardcode anything service-specific that the brief did not state,
  and never carry over a detail from the exemplar service. When a needed detail is
  missing or ambiguous, ask the user rather than guessing or copying.
- When done, hand the client the tRPC procedure names and their input/output shapes so
  create-service-ui can consume them.
