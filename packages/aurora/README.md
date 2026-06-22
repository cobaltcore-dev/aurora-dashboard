# @cobaltcore-dev/aurora

An OpenStack dashboard library. Provides a ready-made Fastify server and a React UI component that you wire up in your own app.

## Installation

```bash
npm install @cobaltcore-dev/aurora
```

**Peer dependencies** you must also install:

```bash
npm install react react-dom fastify
```

## Quick start

Aurora has two entry points: `server` and `client`.

### Server

```ts
import path from "path"
import { createServer } from "@cobaltcore-dev/aurora/server"

const server = await createServer({
  identityEndpoint: "https://keystone.example.com/v3/",
  policyDir: path.resolve(__dirname, "../policies"),
})

server.listen({ host: "0.0.0.0", port: 4000 })
```

### Client

```tsx
import { AuroraApp } from "@cobaltcore-dev/aurora/client"

export function App() {
  return (
    <AuroraApp
      bffEndpoint="/polaris-bff"
      theme="theme-light"
      onThemeChange={(theme) => localStorage.setItem("theme", theme)}
    />
  )
}
```

## Configuration reference

### `createServer(config)`

| Option                            | Type          | Required | Default                    | Description                                                      |
| --------------------------------- | ------------- | -------- | -------------------------- | ---------------------------------------------------------------- |
| `identityEndpoint`                | `string`      | yes      | —                          | OpenStack Keystone v3 URL                                        |
| `policyDir`                       | `string`      | yes      | —                          | Absolute path to a directory of OpenStack policy YAML files      |
| `bffEndpoint`                     | `string`      | no       | `"/polaris-bff"`           | URL prefix for all tRPC routes                                   |
| `viteRoot`                        | `string`      | no       | —                          | Directory that contains `dist/client/` in production             |
| `defaultEndpointInterface`        | `string`      | no       | `"public"`                 | OpenStack service catalog interface                              |
| `proxyUrl`                        | `string`      | no       | —                          | HTTP proxy for OpenStack calls (dev only, ignored in production) |
| `cephRegion`                      | `string`      | no       | —                          | Ceph RGW region for S3 operations                                |
| `imageMetadataExcludedProperties` | `string`      | no       | —                          | Comma-separated image metadata keys to hide in the UI            |
| `cookieName`                      | `string`      | no       | `"dashboard-session-auth"` | Override the session cookie name                                 |
| `crossDomainCookie`               | `boolean`     | no       | `true`                     | Share cookie across subdomains                                   |
| `insecureCookies`                 | `boolean`     | no       | `false`                    | Disable `Secure` flag — only for HTTP-only local dev             |
| `routers`                         | `AnyRouter[]` | no       | `[]`                       | Additional tRPC routers — see [Custom routers](#custom-routers)  |

## Custom routers

`createServer` accepts a `routers` option so consumers can add their own tRPC procedures that run alongside the built-in Aurora routes, sharing the same Fastify request context (session, cookies, OpenStack client).

### Requirements

Routers passed via `routers` **must** be created with the `auroraRouter` function exported from `@cobaltcore-dev/aurora/server`. Using a different `initTRPC` instance produces an incompatible context type and will cause runtime failures when procedures access `ctx.openstack`, `ctx.validateSession`, etc.

Use the exported procedure builders to handle auth:

| Export                   | When to use                                            |
| ------------------------ | ------------------------------------------------------ |
| `protectedProcedure`     | Any procedure that requires a valid session            |
| `projectScopedProcedure` | Procedure needs an OpenStack token scoped to a project |
| `domainScopedProcedure`  | Procedure needs an OpenStack token scoped to a domain  |

### Example

```ts
import { z } from "zod"
import { auroraRouter, protectedProcedure, createServer } from "@cobaltcore-dev/aurora/server"

const customRouter = auroraRouter({
  feedback: protectedProcedure.input(z.object({ message: z.string() })).mutation(async ({ input }) => {
    // ctx.validateSession(), ctx.openstack — all available here
    return { status: "received" }
  }),
})

const server = await createServer({
  identityEndpoint: "https://keystone.example.com/v3/",
  policyDir: path.resolve(__dirname, "../policies"),
  routers: [customRouter],
})
```

The procedure above is reachable at `POST <bffEndpoint>/feedback` via the tRPC client.

### Registering additional Fastify plugins

`createServer` returns the `FastifyInstance` before `.listen()` is called. You can register any Fastify plugin — metrics, tracing, custom middleware — on the returned instance before starting the server:

```ts
const server = await createServer({ ... })

server.register(MyPlugin, { ... })
server.get("/healthz", async () => ({ ok: true }))

await server.listen({ host: "0.0.0.0", port: 4000 })
```

### `<AuroraApp />`

| Prop            | Type                            | Default          | Description                                        |
| --------------- | ------------------------------- | ---------------- | -------------------------------------------------- |
| `bffEndpoint`   | `string`                        | `"/polaris-bff"` | Must match the server's `bffEndpoint`              |
| `theme`         | `"theme-light" \| "theme-dark"` | `"theme-light"`  | Initial theme                                      |
| `onThemeChange` | `(theme) => void`               | —                | Called when the user toggles the theme             |
| `appName`       | `string`                        | `"Aurora"`       | App name shown in the header breadcrumb and logo   |
| `slots`         | `Slots`                         | —                | Optional UI extension points — see [Slots](#slots) |

## Slots

Slots let you inject your own React components into specific locations inside `AuroraApp` without forking the package. Each slot receives an `auroraContext` object with a `client` (tRPC client) for making API calls.

```tsx
import type { SlotProps } from "@cobaltcore-dev/aurora/client"

function MyLogo(_props: SlotProps) {
  return <img src="/my-logo.svg" alt="My App" style={{ height: "1.5rem" }} />
}

function MyBanner({ auroraContext }: SlotProps) {
  // auroraContext.client gives you access to the tRPC API
  return <div>Custom sidebar content</div>
}

function MyFooter(_props: SlotProps) {
  return (
    <footer>
      <a href="/imprint">Imprint</a> · <a href="/privacy">Privacy</a>
    </footer>
  )
}

;<AuroraApp
  slots={{
    logo: MyLogo,
    sideNavBanner: MyBanner,
    pageFooter: MyFooter,
  }}
/>
```

### Available slots

| Slot            | Location                                        | Renders in shadow DOM |
| --------------- | ----------------------------------------------- | --------------------- |
| `logo`          | Page header, replacing the default Aurora logo  | No                    |
| `sideNavBanner` | Bottom of the project side navigation           | Yes                   |
| `pageFooter`    | Page footer, replacing the default empty footer | No                    |

**Shadow DOM isolation:** Slots rendered in a shadow DOM cannot inherit styles from the host page. If your slot component uses a CSS framework, inject the styles inline:

```tsx
import styles from "my-lib/styles.css?inline"

function MyBanner(_props: SlotProps) {
  return (
    <>
      <style>{styles}</style>
      <div>...</div>
    </>
  )
}
```

## License

Apache-2.0
