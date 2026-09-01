---
"@cobaltcore-dev/aurora": patch
---

Refactor loading and error states to use Juno's Status component for consistent
UI presentation. Replace custom Spinner+Stack loading layouts and custom error
layouts with the standardized Status component across route loaders and list
views.
