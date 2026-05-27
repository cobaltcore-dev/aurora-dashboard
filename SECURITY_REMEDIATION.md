# Summary

Security audit follow-up. Fixes applied via static analysis; path traversal and CSRF protections verified at runtime.

- Verified path traversal blocked at UUID validation layer (`curl`)
- Verified CSRF protection on content-type bypass and cross-origin forced-logout (both 403)
- Closes #820
- `.npmrc` `minimum-release-age` + CI pnpm version guard — Closes #843

## What Was Fixed

| Severity | File                           | What changed                                                                                                                                                                                              |
| -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HIGH     | `sessionRouter.ts`             | `setCurrentScope` → `protectedProcedure`. Unauthenticated callers could rescope any live session to any project.                                                                                          |
| HIGH     | `server.ts`                    | Global rate limit: 200 req/min per IP via `@fastify/rate-limit`. Upload route capped at 10 req/min.                                                                                                       |
| MEDIUM   | `sessionRouter.ts`             | `getAuthToken` → `protectedProcedure`. Raw Keystone auth token was readable by any JS on the page.                                                                                                        |
| MEDIUM   | `sessionRouter.ts`             | `terminateUserSession` → `protectedProcedure`. Anyone from the same origin could force-logout a user.                                                                                                     |
| MEDIUM   | `server.ts`, `imageHelpers.ts` | UUID regex validation on `imageId` before Glance URL construction. A value like `../versions` would otherwise hit arbitrary Glance paths.                                                                 |
| MEDIUM   | `sessionCookie.ts`             | Cookie `Secure` flag now defaults to `true` everywhere. Opt-out via `INSECURE_COOKIES=true`. Previously any non-`production` env (staging, QA, preview) sent session cookies over plain HTTP.             |
| MEDIUM   | `server.ts`                    | 5 GB body limit and 10-min timeout scoped to the upload route only. Global defaults are now 1 MB / 30 s — every endpoint was previously exploitable for slow-rate DoS.                                    |
| MEDIUM   | `package.json`                 | Bumped `brace-expansion` pnpm override to `>=5.0.6` ([GHSA-jxxr-4gwj-5jf2](https://github.com/advisories/GHSA-jxxr-4gwj-5jf2)). Dev-tooling dep only (`commitizen`, `eslint`). `pnpm audit` now clean.  |
| LOW      | `image.ts`                     | `.passthrough()` → `.catchall(z.unknown())` on the image schema. Stops arbitrary unvalidated keys being silently forwarded to Glance.                                                                     |
| LOW      | `server.ts`                    | `FastifyHelmet` moved outside `isProduction` block — staging/QA now get CSP, `X-Frame-Options`, HSTS. Dev has CSP disabled to allow Vite HMR.                                                            |
| LOW      | `.npmrc`, CI                   | Added `minimum-release-age=10080` (7 days). CI guard fails if pnpm <10.16 (versions that silently ignore this setting).                                                                                   |

## What Still Needs to Be Done

### Set `COOKIE_SECRET` in production — #841

**Severity:** HIGH
**Owner:** Ops / whoever manages the production environment

Without a signing secret, the server accepts any cookie value without HMAC verification. An attacker who intercepts a session cookie can modify it freely. The enforcement code is already in `server.ts` — it hard-fails at startup in production if the variable is missing. It just needs the secret to exist.

**Action:** Generate a random 32+ character secret, store it in the secret manager, inject as `COOKIE_SECRET` into the production environment. Do this before the next production deploy.
