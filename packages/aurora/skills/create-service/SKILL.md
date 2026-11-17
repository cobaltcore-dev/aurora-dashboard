---
name: create-service
description: >-
  Scaffold a complete new OpenStack service in Aurora end to end - both the BFF
  (server) and the UI (client) - from a short brief. Use when the user says
  "create a new service", "add an OpenStack service to aurora", "scaffold the X
  service", or asks to build a new service's dashboard. Orchestrates
  create-service-bff and create-service-ui; stays generic and adds no
  service-specific logic of its own.
metadata:
  area: orchestrator
requires:
  - create-service-bff
  - create-service-ui
---

Build a new Aurora service end to end by orchestrating the two worker skills. This
skill owns no implementation detail - it collects a brief, runs the workers in order,
and tracks the shared wiring. All server detail lives in **create-service-bff**; all
client detail lives in **create-service-ui**.

## 1 - Collect the service brief (ask once, consolidated)

Take the brief from the epic / requirements if one was provided; otherwise, and for
anything the epic leaves unclear, ask the user in a single consolidated question. Do
not guess, and do not infer details from an existing service. Gather only what the
workers need:

- **Service name** (e.g. `KeyManager` / `key-manager`) and the OpenStack API it proxies.
- **Resources** and, per resource, the **operations** (list / get / create / update / delete).
- The **nav section** it belongs under (compute, network, storage, authorization, ...).

If the user already gave a detail, skip asking for it.

## 2 - Build the BFF

Run **create-service-bff** with the brief. It produces the zod types, the
project-scoped tRPC resource router, the permission router, and registers the service
in `src/server/routers.ts`. It returns the tRPC procedure names and their
input/output shapes.

## 3 - Build the UI

Run **create-service-ui** with the brief plus the BFF procedure shapes from step 2. It
produces the file-based routes, `apiHelpers`, and the list/detail views - building the
actual components with the juno ui-components Intent skills - and adds the nav entry.

## 4 - Finish

Remind the user / complete:

- Server router is registered in `buildBaseRouter` (`src/server/routers.ts`).
- Nav entry is added in `buildNavSections.ts`.
- Add a changeset for `@cobaltcore-dev/aurora` describing the new service.
- Run `pnpm typecheck` and `pnpm test` in `packages/aurora`; fix any failures.

## Rules

- Stay generic: this skill contributes no service-specific logic - everything is
  derived from the brief and delegated to the workers.
- Keep the BFF authoritative and the UI dumb (business logic on the server only).
- If the user only wants one half, run just the matching worker skill directly.
