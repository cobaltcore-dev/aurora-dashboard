---
"@cobaltcore-dev/aurora": minor
---

feat(config): add per-domain app configuration support

Consumers can now pass a typed `appConfig` to `createServer` to tailor the app per home domain. The BFF resolves it (base layer plus cascading `overrides` matched against the user's domain) and serves it via the public `appConfig.get` procedure, also exposing the merged result on `ctx.appConfig` for custom procedures.

- New exports: `AuroraAppConfig` and related types (`Visibility`, `VisibilityDelta`, `ServiceConfig`, ...), `resolveAppConfig`, `auroraAppConfigSchema` (a Zod schema factory for validating externally-loaded config, e.g. from a mounted ConfigMap), `SLOT_NAMES` (server); `AppConfigProvider`, `useAppConfig`, `useFeature`, `useIsAppConfigLoading` (client).
- `services` and `slots` each take a `Visibility` rule that declares the posture explicitly: `{ mode: "allowlist", allow: [...] }` shows only the listed keys, `{ mode: "denylist", deny: [...] }` shows everything except the listed keys. Omit for default-open. Switching posture is a one-field edit.
- `serviceSettings`, `slotSettings`, and `features` carry per-service, per-slot, and app-wide data respectively, fully decoupled from visibility.
- `overrides` adjust membership per domain via `enable`/`disable` deltas (never posture): `enable` shows a key, `disable` hides it; settings and features deep-merge.
- Fully optional and backwards compatible: with no `appConfig`, Aurora keeps its default-open behavior.
- Removes the unused `projectOverviewBanner` slot from the `Slots` type and its render site. No consumer registered it.
