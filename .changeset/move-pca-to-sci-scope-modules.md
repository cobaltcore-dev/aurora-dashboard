---
"@cobaltcore-dev/aurora": minor
---

Consumers can now register additional project-scoped services in Aurora. Pass your service definitions via the `additionalProjectServices` prop on `AuroraApp` to plug in client-side routes, and register your BFF router via the existing `routers` config in `createServer`. Additional services are only shown to users when the service is available in the project's OpenStack service catalog and not excluded by the app's `enabledServices` list.

This replaces the previously hardcoded PCA (Clavis) integration. PCA and any other consumer-specific service should now be registered this way rather than living inside the OSS package.
