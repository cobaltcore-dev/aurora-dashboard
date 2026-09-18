---
"@cobaltcore-dev/aurora": patch
---

Detect the real cause of a failed project/domain rescope. Keystone returns HTTP 401 both when the base token is no longer valid (session changed/revoked in another tab) and when the requested scope cannot be authorized (project/domain missing or no role). These are now distinguished: an invalid base token surfaces as UNAUTHORIZED ("session changed") while a still-valid base token surfaces as NOT_FOUND ("Project Not Accessible"), instead of always showing a generic "Session Expired" message.
