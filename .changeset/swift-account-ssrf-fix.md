---
"@cobaltcore-dev/aurora": patch
---

Fix Swift account SSRF vulnerability (HIGH severity). Add input validation to prevent SSRF attacks via user-controlled account parameters. Rejects absolute URLs, path traversal, and malicious formats. Protects 21+ Swift operations.
