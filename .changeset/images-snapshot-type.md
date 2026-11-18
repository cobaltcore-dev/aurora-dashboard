---
"@cobaltcore-dev/aurora": patch
---

- Show snapshot types and add Type filtering across all Images tabs using image type and block device snapshot markers
- Load all shared-image pages before filtering Accepted and Suggested images
- Limit shared-image membership lookups to ten concurrent requests to reduce throttling
- Capitalize the Images and Snapshot type labels
- Allow both Type pills; no selection or both selections shows all types without an All pill
