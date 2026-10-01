---
"@cobaltcore-dev/aurora": patch
---

Improved the not-found messaging in the router's default not-found component (`ServiceLevelDefaultError`). The title and body now reflect the context: inside a project an unmatched route reads as "Service Not Found", while an unmatched top-level route reads as "Page Not Found", each with a matching body and recovery action.
