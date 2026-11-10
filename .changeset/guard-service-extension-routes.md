---
"@cobaltcore-dev/aurora": patch
---

- Guard service-extension routes so a disabled extension cannot be reached by navigating directly to its URL
- The `/projects/$projectId/services/$serviceType` route now enforces the same visibility rules the side nav and project home page use: it honors the `enabledServices` allow list and `deniedServices` deny list, and verifies the extension's `serviceType`/`serviceName` against the project's OpenStack catalog
- A disabled or catalog-absent extension redirects to the project home page; an unknown `serviceType` continues to return not-found
