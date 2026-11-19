---
"@cobaltcore-dev/aurora": minor
---

- Add the Kubernetes (Gardener) BFF foundation: a project-scoped `kubernetes.getGardenerInfo` query that reads the Gardener API server version for the qa, canary or prod landscape
- Resolve each landscape from the project's service catalog (`persephone-<landscape>`) and authenticate server-side with the project's Keystone token; the token never reaches the browser
- Map Gardener errors, including error bodies returned with HTTP 200, to tRPC error codes without signing the user out when only Gardener rejects the credentials
- Note: the app router now has a `kubernetes` key; custom routers passed to `createServer` must not use that name
