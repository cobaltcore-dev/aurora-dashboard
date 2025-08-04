# Aurora Dashboard – Architecture Overview

## Introduction

Aurora Dashboard is a modern replacement for the legacy OpenStack Horizon interface. It is designed to be fast, modular, and developer-friendly, offering a clean and type-safe experience across the stack. By following a Backend-for-Frontend (BFF) architecture, we abstract away OpenStack complexity and deliver a UI that is decoupled, composable, and scalable.

This document describes the architecture, conventions, technologies, and implementation strategies used to build and maintain the Aurora Dashboard.

---

## Tech Stack and Tooling

| Area              | Tooling                             |
| ----------------- | ----------------------------------- |
| UI Framework      | React 19, juno                      |
| Styling           | Tailwind CSS v4                     |
| Routing           | TanStack Router (v1)                |
| API Communication | tRPC + Zod                          |
| Server Runtime    | Fastify                             |
| i18n              | Lingui                              |
| Dev Tools         | Vite, Vitest, pnpm, TurboRepo       |
| Code Quality      | ESLint, Husky, Conventional Commits |

---

## Monorepo Structure

Aurora uses a pnpm-based monorepo managed by TurboRepo. Shared tooling is centralized, and apps and packages are clearly separated.

```
/aurora
  /apps
    /aurora-portal         # Main frontend application
  /packages
    /aurora-sdk            # tRPC client wrapper
    /signal-openstack      # OpenStack integration layer
    /config                # Shared tsconfig, eslint, tailwind config
    /template              # Internal package scaffold template
```

---

## Frontend Routing and State – TanStack Router

We use TanStack Router v1 with file-based routing to build our UI declaratively and with type safety at every level.

### File-based Routing Conventions

To maximize DX and enable type-safe navigation:

- All route files for dynamic segments use a $ prefix, e.g. /$projectId.tsx
- UI subfolders that shouldn’t become routes (e.g., components) are prefixed with -, e.g. `-components/`
- Each route export `component`, `loader`, and optionally `beforeLoad`
- Internal folders like are excluded from route generation

Example route tree:

```
routes/
  _auth/
    accounts/
      $accountId/
        projects/
          $projectId/
            compute/$
            network.tsx
    -components/
      ProjectSubNavigation.tsx
```

### Shared Layout and Auth Guarding

The `_auth` route is a shared layout for all authenticated views. It uses `beforeLoad` to check or hydrate session state:

```ts
export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
  beforeLoad: async ({ context, location }) => {
    if (!context.auth?.isAuthenticated) {
      const token = await context.trpcClient?.auth.getCurrentUserSession.query()
      if (!token) {
        throw redirect({ to: "/auth/login", search: { redirect: location.href } })
      }
      context.auth?.login(token.user, token.expires_at)
    }
  },
})
```

This makes sure no child route loads without a scoped session.

### Rescoping Tokens in Loaders

OpenStack APIs require project- or domain-scoped tokens. These are set via tRPC mutations in route loaders:

```ts
const data = await context.trpcClient?.auth.setCurrentScope.mutate({
  type: "project",
  projectId: params.projectId || "",
})
```

Components do not perform data fetching. They receive fully scoped data via loader return values.

### Declarative Subnavigation

Subnavigation is constructed declaratively using `linkOptions` and `useParams`, avoiding manual URL construction:

```tsx
const options = [
  linkOptions({
    to: "/accounts/$accountId/projects/$projectId/compute/$",
    label: "Compute",
    params: { accountId: "accountId", projectId: "projectId" },
  }),
]

export function ProjectSubNavigation() {
  const params = useParams({ from: "/_auth/accounts/$accountId/projects/$projectId" })
  return <SubNavigationLayout options={options} params={params} />
}
```

Benefits:

- No manual path building
- Automatic active states
- Purely param-driven context

Subnavigation is active-aware and context-dependent without additional logic.

---

## Server-Side Architecture – BFF with Fastify and tRPC

Aurora uses a Backend-for-Frontend (BFF) pattern implemented with Fastify. All API interactions go through tRPC routes, which internally communicate with OpenStack services using a unified abstraction layer (`signal-openstack`).

### Benefits of BFF

- UI remains clean and stateless
- All API contracts are validated and typed
- OpenStack logic is fully encapsulated
- Enables token scoping, retry logic, and API stitching

### Folder Structure

Each domain is in a PascalCase folder (e.g., Compute, Network) and contains:

```
Compute/
  routers/
    keypair.ts
  types/
    keypair.ts
  tests/
    keypair.test.ts
```

### Example: Keypair Domain

#### Zod Schema

```ts
export const keypairSchema = z.object({
  name: z.string(),
  public_key: z.string().optional(),
  fingerprint: z.string().optional(),
  type: z.union([z.literal("ssh"), z.literal("x509"), z.string()]).optional(),
  user_id: z.string().optional().nullable(),
  created_at: z.string().optional(),
  deleted: z.boolean().optional(),
  deleted_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  id: z.number().optional(),
  private_key: z.string().optional().nullable(),
})
```

#### tRPC Router

```ts
getKeypairsByProjectId: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ input, ctx }) => {
  const session = await ctx.rescopeSession({ projectId: input.projectId })
  const compute = session?.service("compute")
  const response = await compute?.get("os-keypairs").then((r) => r.json())
  const parsed = keypairsResponseSchema.safeParse(response)
  return parsed.success ? parsed.data.keypairs.map((k) => k.keypair) : undefined
})
```

#### Vitest Tests

```ts
describe("OpenStack Keypair Schema", () => {
  it("validates correct keypair", () => {
    const result = keypairSchema.safeParse({ name: "my-key" })
    expect(result.success).toBe(true)
  })

  it("fails on missing name", () => {
    const result = keypairSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
```

---

## Testing Strategy

### Lingui + Vitest Setup

All component tests use `I18nProvider` and activate language context via `act()`.

```tsx
import { render, act } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import App from "./App"

const TestingProvider = ({ children }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

test("should translate to German", async () => {
  await act(() => i18n.activate("de"))
  const { findByText } = render(<App />, { wrapper: TestingProvider })
  expect(await findByText("Willkommen beim Aurora-Dashboard")).toBeInTheDocument()
})
```

---

## Infrastructure Context: Gardener

Aurora primarily targets OpenStack APIs, but we also integrate with **Gardener**, a Kubernetes-native service management platform. Gardener provides a standardized Kubernetes API abstraction for managing clusters and infrastructure services, which fits well into our model for domain-scoped control and tRPC-driven orchestration.

---

## Summary

Aurora Dashboard provides a robust, modern frontend and backend architecture with full type safety, modular structure, and OpenStack abstraction. Its key strengths include:

- File-based, loader-driven frontend with TanStack Router
- Stateless and clean UI powered by scoped route context
- Fully decoupled BFF server using Fastify, tRPC, and Zod
- Declarative subnavigation and scoped auth token logic
- Testable domain modules and schema validation
- Support for hybrid backends including OpenStack and Gardener

Aurora is built to scale, to onboard developers quickly, and to support future cloud platforms with minimal coupling.
