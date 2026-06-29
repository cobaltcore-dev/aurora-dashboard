---
"@cobaltcore-dev/aurora": patch
---

fix: add router to useCallback dependencies in AuthProvider

Fixes stale closure issue where logout and closeInactivityModal callbacks could capture outdated router references.
