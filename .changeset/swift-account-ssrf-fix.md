---
"@cobaltcore-dev/aurora": patch
---

Fix Swift account SSRF vulnerability. Add input validation to prevent SSRF attacks via account parameters. Rejects absolute URLs, path traversal, and malicious formats.
