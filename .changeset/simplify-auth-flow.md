---
"@cobaltcore-dev/aurora": minor
---

Simplify auth flow and improve session handling

- Move tRPC auth calls into AuthProvider for centralized session management
- Add auto-logout on session expiry with return URL saved for redirect after re-login
- Use uncontrolled form inputs in LoginForm for simpler code
- Remove unnecessary useCallback wrappers (React 19 optimizes automatically)
