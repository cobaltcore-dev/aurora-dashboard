# App configuration (`appConfig`)

`appConfig` is an optional object passed to `createServer` that controls which services and UI slots are visible, and sets feature flags globally and per domain. The resolved configuration is computed on each request (based on the user's home domain) and delivered to the client automatically.

> This document describes the current shape at the time of writing. For an authoritative and up-to-date list of supported fields, always check the TypeScript types in [`src/types/appConfig.ts`](../src/types/appConfig.ts) and the Zod validation schema in [`src/server/AppConfig/appConfigSchema.ts`](../src/server/AppConfig/appConfigSchema.ts).

## Default-open behavior

When `appConfig` is omitted, Aurora runs in **default-open** mode: every service present in the user's OpenStack catalog is shown, and every registered slot component renders. This is the right default for OSS deployments and local development.

## Two independent axes: visibility and settings

The design keeps two concerns separate so you can tune one without affecting the other:

- **Visibility** (`services`, `slots`): what renders.
- **Settings** (`serviceSettings`, `slotSettings`, `features`): data passed through to the UI. Setting these never changes what is visible.

### Visibility and posture

`services` and `slots` each take a `Visibility` rule that declares the posture explicitly:

```ts
type Visibility =
  | { mode: "allowlist"; allow: string[] } // nothing shows unless listed
  | { mode: "denylist"; deny: string[] } // everything shows unless listed
```

- `mode: "allowlist"` — only the keys in `allow` render. Use this while releasing services gradually.
- `mode: "denylist"` — everything renders except the keys in `deny`. Use this once most services are mature and you only need to hide a few.
- Omit the rule entirely for default-open.

Because posture is a discriminated union on `mode`, `allow` and `deny` can never both be present — the schema rejects it at boot and TypeScript rejects it at compile time. Switching posture is a one-field edit: change `mode` and rename the list.

### Settings

`serviceSettings` carries per-service configuration, `slotSettings` carries per-slot data bags (e.g. banner text), and `features` carries app-wide flags. Each `serviceSettings` entry is a flat, consumer-defined bag (same idea as a slot's bag). None of them affect visibility, so you can configure a service in a default-open deployment without accidentally hiding anything else.

```yaml
serviceSettings:
  images:
    showAdvancedOptions: true
features:
  termsAndConditionsUrl: "https://example.com/terms"
```

## Domain overrides

Add an `overrides` array to adjust the configuration for specific domains. Each override has a `domain` pattern (a string compiled to `RegExp`, or a `RegExp` literal) matched against the user's home domain name. The `name` field is a human-readable label used only for debugging.

Overrides change **membership**, never posture. Instead of allow/deny lists they use enable/disable deltas:

```yaml
overrides:
  - name: acme
    domain: "^acme-"
    services:
      enable: [flavors] # make flavors visible for this domain
      disable: [images] # hide images for this domain
```

`enable` always makes a key visible for the domain and `disable` always hides it, regardless of the base posture. Because overrides carry no `mode`, a domain can never silently flip the posture the base pinned.

Resolution rules when a domain matches:

- `services`/`slots`: the override's `enable`/`disable` fold onto the base-pinned posture. `disable` is applied after `enable`, so it wins when a key is in both. Across multiple matching overrides, later ones win per key.
- `serviceSettings`/`slotSettings`/`features`: deep-merge per key.

### What enable/disable do in each posture

| Base posture           | `enable: [x]`                      | `disable: [y]`                 |
| ---------------------- | ---------------------------------- | ------------------------------ |
| allowlist              | adds `x` to the shown set          | removes `y` from the shown set |
| denylist               | lifts the denial of `x` (shows it) | adds `y` to the hidden set     |
| default-open (no rule) | no-op (already shown)              | hides `y` (becomes a denylist) |

## Full example

```ts
import type { AuroraAppConfig } from "@cobaltcore-dev/aurora/server"

const config: AuroraAppConfig = {
  services: { mode: "allowlist", allow: ["ceph-containers", "images"] },
  slots: { mode: "denylist", deny: ["projectsBanner"] },
  serviceSettings: {
    images: { showAdvancedOptions: true },
  },
  features: {
    termsAndConditionsUrl: "https://example.com/terms",
  },
  overrides: [
    {
      name: "power-tenant",
      domain: /^power-/,
      services: { enable: ["flavors"] },
      features: { termsAndConditionsUrl: "https://power.example.com/terms" },
    },
  ],
}

await createServer({ identityEndpoint: "...", policyDir: "...", appConfig: config })
```

### Switching from allowlist to denylist

Flip the base posture in one edit; overrides and settings are untouched:

```yaml
# before — allowlist era
services: { mode: allowlist, allow: [ceph-containers, images] }

# after — denylist era
services: { mode: denylist, deny: [pca] }
```

## Loading from YAML

Aurora accepts a plain object; how you produce it is up to you. A common pattern for Kubernetes-based deployments is to mount a ConfigMap as a YAML file and read it at server startup:

```ts
import { readFileSync } from "node:fs"
import { parse as parseYaml } from "yaml"
import { auroraAppConfigSchema } from "@cobaltcore-dev/aurora/server"

function loadAppConfig() {
  const configPath = process.env.AURORA_APP_CONFIG_PATH
  if (!configPath) return undefined
  const raw = readFileSync(configPath, "utf8")
  return auroraAppConfigSchema().parse(parseYaml(raw))
}

await createServer({ identityEndpoint: "...", policyDir: "...", appConfig: loadAppConfig() })
```

`auroraAppConfigSchema` is the Zod schema exported from `@cobaltcore-dev/aurora/server`. Note that `domain` fields in YAML cannot be RegExp literals; write them as strings (e.g. `"^power-"`) and the resolver compiles them to `RegExp` at runtime.
