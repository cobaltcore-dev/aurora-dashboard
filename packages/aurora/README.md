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

### Server (`src/server/server.ts`)

```ts
import path from "path"
import { createServer } from "@cobaltcore-dev/aurora/server"

createServer({
  viteRoot: path.resolve(__dirname, "../.."), // root of your app (where dist/client lives)
  identityEndpoint: process.env.IDENTITY_ENDPOINT, // OpenStack Keystone URL
  bffEndpoint: process.env.BFF_ENDPOINT, // tRPC prefix, default "/polaris-bff"
  defaultEndpointInterface: process.env.DEFAULT_ENDPOINT_INTERFACE, // "public" | "internal"
  proxyUrl: process.env.GLOBAL_AGENT_HTTP_PROXY, // optional HTTP proxy (dev only)
  cephRegion: process.env.CEPH_REGION, // Ceph/S3 region for object storage
  imageMetadataExcludedProperties: process.env.IMAGE_METADATA_EXCLUDED_PROPERTIES, // comma-separated
  insecureCookies: process.env.INSECURE_COOKIES === "true", // disable Secure flag locally
}).then((server) => server.listen({ host: "0.0.0.0", port: 4000 }))
```

### Client (`src/client/App.tsx`)

```tsx
import { AuroraApp } from "@cobaltcore-dev/aurora/client"
import "@cobaltcore-dev/aurora/client/style.css" // include once at your app root

export function App() {
  return (
    <AuroraApp
      bffEndpoint="/polaris-bff" // must match the server's bffEndpoint
      theme="theme-light" // "theme-light" | "theme-dark"
      onThemeChange={(theme) => {
        // called when user toggles — persist however you like
        localStorage.setItem("theme", theme)
      }}
    />
  )
}
```

## Configuration reference

### `createServer(config)`

| Option                            | Type      | Default                    | Description                                                      |
| --------------------------------- | --------- | -------------------------- | ---------------------------------------------------------------- |
| `identityEndpoint`                | `string`  | —                          | OpenStack Keystone v3 URL (required)                             |
| `bffEndpoint`                     | `string`  | `"/polaris-bff"`           | URL prefix for all tRPC routes                                   |
| `viteRoot`                        | `string`  | `__dirname/../../`         | Directory that contains `dist/client/` in production             |
| `defaultEndpointInterface`        | `string`  | `"public"`                 | OpenStack service catalog interface                              |
| `proxyUrl`                        | `string`  | —                          | HTTP proxy for OpenStack calls (dev only, ignored in production) |
| `cephRegion`                      | `string`  | —                          | Ceph RGW region for S3 operations                                |
| `imageMetadataExcludedProperties` | `string`  | —                          | Comma-separated image metadata keys to hide in the UI            |
| `cookieName`                      | `string`  | `"dashboard-session-auth"` | Override the session cookie name                                 |
| `crossDomainCookie`               | `boolean` | `true`                     | Share cookie across subdomains                                   |
| `insecureCookies`                 | `boolean` | `false`                    | Disable `Secure` flag — only for HTTP-only local dev             |

### `<AuroraApp />`

| Prop            | Type                            | Default          | Description                            |
| --------------- | ------------------------------- | ---------------- | -------------------------------------- |
| `bffEndpoint`   | `string`                        | `"/polaris-bff"` | Must match the server's `bffEndpoint`  |
| `theme`         | `"theme-light" \| "theme-dark"` | `"theme-light"`  | Initial theme                          |
| `onThemeChange` | `(theme) => void`               | —                | Called when the user toggles the theme |

## Environment variables

Your app reads these from `.env` and passes them to `createServer()`. Aurora itself never reads environment variables.

```env
IDENTITY_ENDPOINT="https://keystone.example.com/v3/"
DEFAULT_ENDPOINT_INTERFACE="public"
BFF_ENDPOINT="/polaris-bff"
PORT="4000"

# Object storage (optional)
CEPH_REGION="ceph-objectstore-st1-region-1"

# Local dev only
INSECURE_COOKIES=true
# GLOBAL_AGENT_HTTP_PROXY=http://localhost:8888
```

The `VITE_BFF_ENDPOINT` variable (prefixed with `VITE_`) is read by Vite and passed to the client:

```env
VITE_BFF_ENDPOINT="/polaris-bff"
```

```tsx
<AuroraApp bffEndpoint={import.meta.env.VITE_BFF_ENDPOINT} />
```

## Vite config

In development, point Vite at your own server plugin. In production no extra plugins are needed — aurora ships pre-built CSS and assets.

```js
// vite.config.mjs
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import viteFastify from "@fastify/vite/plugin"

export default defineConfig(({ mode }) => ({
  root: "./src/client",
  build: { outDir: "../../dist/client" },
  plugins: [mode !== "production" && viteFastify(), react()],
}))
```

## Running the app

```bash
# Development (hot-reload)
tsx watch --env-file=.env src/server/server.ts

# Production
NODE_ENV=production tsx --env-file=.env src/server/server.ts
```

## License

Apache-2.0
