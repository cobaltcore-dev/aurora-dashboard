---
"@cobaltcore-dev/aurora": patch
---

Add session monitor with timer-based expiration check. Sessions now show an expiration modal instead of immediately redirecting to login, improving UX by explaining why the session ended.

- Timer-based expiration logic consolidated: both immediate-expiry and timeout branches call `logout("expired")` for consistent server session termination
- Remove redundant `getCurrentUserSession` fetch in route guard since expiration is purely timer-based
