---
"@cobaltcore-dev/aurora": patch
---

- Add ownership verification for EC2 credential deletion to prevent IDOR attacks
- Return NOT_FOUND for unauthorized deletion attempts (prevents resource enumeration)
- Make DELETE idempotent (404 on GET returns success)
- Map 401/403 from identity service to proper error codes
