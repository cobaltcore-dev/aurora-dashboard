# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aurora Dashboard is an OpenStack cloud management interface built as a pnpm monorepo. The core product is `@cobaltcore-dev/aurora`, a publishable npm library with two entry points: a Fastify-based BFF server (`@cobaltcore-dev/aurora/server`) and a React UI component (`@cobaltcore-dev/aurora/client`). The reference app in `apps/dashboard` demonstrates integration.

## Architecture

### Monorepo Structure

```
aurora-dashboard/
├── apps/
│   └── dashboard/               # Reference consumer app
│       ├── src/server/          # Fastify server initialization
│       └── src/client/          # Client entry point
└── packages/
    ├── aurora/                  # Published library (@cobaltcore-dev/aurora)
    │   ├── src/server/          # BFF server, tRPC routers, OpenStack API integration
    │   └── src/client/          # React app, TanStack Router, UI components
    ├── signal-openstack/        # Typed OpenStack HTTP client (undici-based)
    ├── policy-engine/           # OpenStack oslo.policy evaluator
    └── config/                  # Shared TypeScript and ESLint config
```

### Key Technologies

- **Build orchestration**: Turborepo with pnpm workspaces
- **Server**: Fastify 5, tRPC 11, session-based auth via cookies
- **Client**: React 19, TanStack Router v1, TanStack Query v5, TailwindCSS 4
- **OpenStack integration**: `signal-openstack` package wraps undici for typed API calls
- **Policy evaluation**: `policy-engine` evaluates OpenStack oslo.policy rules in-browser and server-side
- **Internationalization**: Lingui with PO format
- **Testing**: Vitest (unit), Playwright (e2e)

### Server Architecture (`packages/aurora/src/server`)

The BFF is a Fastify server exposing tRPC procedures. All routers are built with `auroraRouter()` from `trpc.ts` to share a unified context.

**Context (`context.ts`)**: Every tRPC procedure receives:

- `ctx.openstack`: Instance of `signal-openstack` client for the authenticated session
- `ctx.validateSession()`: Throws if session is invalid
- `ctx.req`/`ctx.res`: Fastify request/response objects
- Session data via `ctx.req.session`

**Routers (`routers.ts`)**: The root router merges domain-specific routers:

- `authRouters`: Authentication (login, logout, session)
- `buildComputeRouters(policyDir)`: Images, flavors (Glance, Nova)
- `buildObjectStorageRouters(policyDir)`: Swift containers, Ceph S3 (via `@aws-sdk`)
- `buildNetworkRouters(policyDir)`: Security groups, floating IPs (Neutron)
- `projectRouters`: Project listing, scope switching
- `serviceRouters`: Service catalog, capabilities

Domain routers live in `src/server/<Domain>/routers.ts` (e.g., `Compute/routers.ts`, `Network/routers.ts`).

**Custom routers**: Consumers can pass additional routers via `createServer({ routers: [...] })`. These MUST use `auroraRouter` from `@cobaltcore-dev/aurora/server` to match the context type.

**Session management (`sessionCookie.ts`)**: Sessions are stored in an encrypted, signed cookie. The cookie schema is defined in `sessionCookie.ts` and validated on every protected procedure.

**Policy enforcement**: Routers receive `policyDir` and load oslo.policy YAML files for per-action authorization checks via the `policy-engine` package.

### Client Architecture (`packages/aurora/src/client`)

A single-page React app using TanStack Router with file-based routing.

**Router (`router.ts`, `routeTree.gen.ts`)**: Routes are defined in `src/client/routes/` and compiled by `@tanstack/router-plugin` into `routeTree.gen.ts`. The root route (`__root.tsx`) provides:

- tRPC client via context (`useRouteContext()`)
- Theme state (`theme-light` / `theme-dark`)
- `onTrackEvent` callback for analytics
- Slots for UI extension points

**Route structure**:

- `/_auth`: Protected routes requiring authentication
- `/_auth/projects/$projectId`: Project-scoped routes (compute, storage, network)
- `/index.tsx`: Landing/login page

**State management**: TanStack Query for server state, Zustand stores in `src/client/store/` for UI state (e.g., navigation, table selections).

**tRPC client (`trpcClient.ts`)**: Configured with session-based auth. All API calls are typed end-to-end via `AppRouter` type from the server.

**Slots**: Consumer apps inject custom components via `<AuroraApp slots={{ ... }} />`. Available slots:

- `logo`, `pageFooter`: Top-level UI
- `sideNavBanner`: Bottom of project nav
- `serviceBadge`, `servicePageActions`, `serviceBanner`: Per-service customization
- `login`: Replace default login form (e.g., for OIDC)

**Components (`src/client/components/`)**: Shared UI components (navigation, error boundaries, list toolbars, JSON editor, etc.). Most components use TailwindCSS with class-variance-authority for variants.

### signal-openstack Package

Wraps undici for OpenStack API calls. Handles:

- Keystone v3 authentication (scoped/unscoped tokens)
- Service catalog resolution (finds endpoints by service type and interface)
- Session management (token refresh, scope switching)
- Error normalization (maps OpenStack errors to typed exceptions)

Main exports:

- `OpenstackClient`: HTTP client with `request(method, path, options)`
- `createSession(config)`: Authenticate and return a session
- Service-specific helpers in `service.ts`

### policy-engine Package

Evaluates OpenStack oslo.policy rules. Used both server-side (for authorization) and client-side (for UI permission checks).

**API**:

- `createPolicyEngineFromFile(path)`: Load policy YAML/JSON
- `policyEngine.policy(keystoneToken)`: Build context from token
- `policy.check(ruleName, params)`: Evaluate a rule (returns boolean)

**Rule syntax**: Supports `@` (allow), `!` (deny), `role:admin`, `user_id:%(target.user.id)s`, `rule:other_rule`, logical operators (`and`, `or`, `not`), etc.

## Development Commands

### Root-level commands (run from repository root)

```bash
pnpm install              # Install all dependencies
pnpm dev                  # Start dashboard app in dev mode (localhost:4005)
pnpm build                # Build all packages and apps
pnpm preview              # Build and run dashboard in production mode
pnpm test                 # Run unit tests (Vitest) across all packages
pnpm typecheck            # TypeScript type checking
pnpm lint                 # ESLint all packages
pnpm format               # Format code with Prettier
pnpm commit               # Interactive commit helper (commitizen)
```

### Dashboard app commands (run from `apps/dashboard/`)

```bash
pnpm dev                  # Start dev server (tsx watch)
pnpm build                # Vite production build
pnpm preview              # Run production build
pnpm test:e2e             # Run Playwright e2e tests
pnpm test:e2e:ui          # Playwright UI mode
pnpm test:e2e:debug       # Debug Playwright tests
```

### Aurora package commands (run from `packages/aurora/`)

```bash
pnpm build                # Build server (tsup) + client (vite)
pnpm test                 # Run Vitest unit tests
pnpm test:watch           # Vitest in watch mode
pnpm typecheck            # Type check without emit
pnpm check-i18n           # Extract and compile Lingui translations
```

### Running a single test file

```bash
# Vitest (unit tests)
pnpm --filter @cobaltcore-dev/aurora test <filename>

# Playwright (e2e tests)
pnpm --filter @cobaltcore-dev/dashboard test:e2e <spec-file>
```

## Coding Guidelines

### Commit Messages

**CRITICAL**: This project enforces [Conventional Commits](https://www.conventionalcommits.org/) via commitlint. All commits MUST follow this format:

```
<type>(<scope>): <subject>
```

**Allowed types**: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `revert`

**Allowed scopes**: `build`, `config`, `ci`, `core`, `dashboard`, `gardener`, `network`, `aurora`, `portal`, `signal-openstack`, `polaris`, `bff`, `docs`, `deps`, `infra`, `npm`, `ui`, `identity`, `playwright`, `metrics`

**Breaking changes**: Append `!` to the type or add a `BREAKING CHANGE:` footer.

**Use the helper**:

```bash
pnpm commit   # Interactive commit helper
```

**Examples**:

```bash
feat(aurora): add support for custom tRPC routers
fix(network): resolve floating IP association error
perf(signal-openstack): cache service catalog lookups
refactor(bff)!: remove deprecated session format

BREAKING CHANGE: session cookie schema has changed
```

### Adding New tRPC Procedures

1. If extending Aurora's built-in API, add to the appropriate domain router in `packages/aurora/src/server/<Domain>/routers.ts`
2. Import `auroraRouter`, `protectedProcedure`, `publicProcedure` from `../trpc`
3. Use `protectedProcedure` for routes requiring authentication (has access to `ctx.openstack`)
4. Use Zod for input/output validation
5. Policy checks: Call `ctx.policy.check(ruleName, params)` before sensitive operations
6. Return typed objects; tRPC infers types end-to-end

**Example**:

```ts
import { auroraRouter, protectedProcedure } from "../trpc"
import { z } from "zod"

export const myRouter = auroraRouter({
  myProcedure: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    await ctx.validateSession()
    const allowed = ctx.policy.check("compute:get", { target: { id: input.id } })
    if (!allowed) throw new Error("Forbidden")

    const result = await ctx.openstack.request("GET", `/compute/v2/servers/${input.id}`)
    return result
  }),
})
```

### Adding New Client Routes

1. Create `*.tsx` file in `packages/aurora/src/client/routes/` following TanStack Router conventions
2. Run `pnpm build:client` to regenerate `routeTree.gen.ts` (auto-generated by vite plugin)
3. Use `createFileRoute()` from `@tanstack/react-router`
4. Access tRPC client via `useRouteContext()` → `auroraContext.client`
5. Lazy-load heavy components with `React.lazy()` and route-level `loader`

**Example**:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { useRouteContext } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/projects/$projectId/my-service")({
  component: MyServicePage,
})

function MyServicePage() {
  const { auroraContext } = useRouteContext({ from: Route.id })
  const { data } = auroraContext.client.myRouter.myProcedure.useQuery({ id: "123" })
  return <div>{data?.name}</div>
}
```

### OpenStack API Calls

Use the `signal-openstack` client from `ctx.openstack` (server-side) or create a client in a custom hook (client-side, rare).

**Server-side**:

```ts
const response = await ctx.openstack.request("GET", "/compute/v2.1/servers/detail")
```

**Error handling**: `signal-openstack` normalizes OpenStack errors. Catch `OpenstackError` for typed error codes.

### Policy Checks

**Server-side** (in tRPC procedures):

```ts
const allowed = ctx.policy.check("compute:delete", { target: { user_id: serverId } })
if (!allowed) throw new TRPCError({ code: "FORBIDDEN" })
```

**Client-side** (for UI rendering):

```ts
import { usePolicyCheck } from "@/hooks/usePolicyCheck"

function DeleteButton({ serverId }) {
  const canDelete = usePolicyCheck("compute:delete", { target: { user_id: serverId } })
  if (!canDelete) return null
  return <button>Delete</button>
}
```

### Internationalization

Aurora uses Lingui for i18n. Translations are in PO format under `packages/aurora/src/locales/`.

**Usage**:

```tsx
import { Trans, msg } from "@lingui/react/macro"

// In JSX
;<Trans>Delete server</Trans>

// In non-JSX (e.g., aria-label)
const label = msg`Delete server`
```

**Extract and compile**:

```bash
pnpm --filter @cobaltcore-dev/aurora check-i18n
```

### Testing

**Unit tests** (Vitest):

- Colocate with source files: `MyComponent.test.tsx`
- Use `@testing-library/react` for component tests
- Mock tRPC client with `vi.mock()`

**E2E tests** (Playwright):

- Located in `apps/dashboard/e2e/`
- Use page object pattern
- Test against a real OpenStack environment (set `IDENTITY_ENDPOINT` in `.env`)

## Important Patterns

### Session Scope Switching

Users can switch between projects/domains without re-authenticating. The BFF re-authenticates with OpenStack using the refresh token and updates the session cookie.

**Server**: `authRouters` has a `rescope` procedure that calls `signal-openstack` to get a new scoped token.

**Client**: The UI calls `client.auth.rescope.mutate()` and invalidates queries after scope change.

### Error Handling

**Server**: Throw `TRPCError` with appropriate codes (`UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`).

**Client**: Use `ErrorBoundary` from `react-error-boundary` at route or component level. Error components are in `src/client/components/Error/`.

### Slot Rendering

Slots render in either normal DOM or shadow DOM (for CSS isolation). Check `Slot.tsx` for implementation. Slots receive `auroraContext` with `client` (tRPC client) and optional metadata (e.g., `currentService` for service-specific slots).

### Analytics Events

If `onTrackEvent` prop is provided to `<AuroraApp />`, the router automatically fires events on navigation. Custom events can be fired via `onTrackEvent` from route context.

**Event structure**:

```ts
{
  source: "router" | "external-link" | "modal" | ...,
  action: string,  // Route ID or action identifier
  metadata: { pathname, search, section, service, ... }
}
```

## Environment Variables

### Dashboard App (`apps/dashboard/.env`)

```bash
IDENTITY_ENDPOINT="https://keystone.example.com/v3/"  # Required
VITE_BFF_ENDPOINT="/polaris-bff"                      # Required
POLICY_DIR="./policies"                               # Optional, defaults to ./policies
PORT=4005                                             # Optional, defaults to 4005
```

### Aurora Package (passed to `createServer()`)

See `packages/aurora/README.md` for full list. Key options:

- `identityEndpoint`: Keystone v3 URL
- `policyDir`: Absolute path to oslo.policy YAML files
- `bffEndpoint`: tRPC endpoint prefix (default `/polaris-bff`)
- `viteRoot`: Directory containing `dist/client/` for production
- `proxyUrl`: HTTP proxy for OpenStack calls (dev only)

## Deployment

The dashboard is typically deployed as a Docker container. See `docker/` for Dockerfile and compose examples.

**Build**:

```bash
pnpm build
```

**Run production build**:

```bash
pnpm preview
```

**Docker** (from root):

```bash
docker build -f docker/Dockerfile -t aurora-dashboard .
docker run -p 4005:4005 --env-file .env aurora-dashboard
```

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and automated releases.

**Creating a changeset**:

```bash
pnpm changeset
```

Follow the prompts to select packages and describe changes. Commit the generated `.changeset/*.md` file.

**Version bump and publish** (maintainers):

```bash
pnpm version-packages  # Bump versions and update CHANGELOGs
pnpm release           # Publish to npm
```

CI automatically creates "Version Packages" PRs when changesets are merged to `main`.

## Troubleshooting

### Build failures after dependency changes

```bash
pnpm clean        # Remove dist/ and node_modules/
pnpm install      # Reinstall
pnpm build        # Rebuild
```

### Turbo cache issues

```bash
pnpm clean:cache  # Clear Turbo cache
```

### Type errors in `routeTree.gen.ts`

Re-run the build in the aurora package:

```bash
pnpm --filter @cobaltcore-dev/aurora build:client
```

### Session/authentication errors

Check `IDENTITY_ENDPOINT` is reachable and pointing to Keystone v3. Verify session cookie is being set (check browser DevTools → Application → Cookies).

### Policy evaluation failures

Ensure `POLICY_DIR` contains valid oslo.policy YAML files. Check server logs for parse errors. Use `policy-engine`'s debug mode to trace evaluation:

```ts
const policy = policyEngine.policy(token, { debug: true })
```
