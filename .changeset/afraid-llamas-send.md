---
"@cobaltcore-dev/aurora": minor
---

  fix(aurora): improve project not found error handling with better UX

  - Add proper 404 error page when project doesn't exist or user lacks access
  - Extract scope resolution logic into reusable resolveProjectScope utility
  - Differentiate between "project not found" vs "scope operation failed" states
  - Catch NOT_FOUND errors from setCurrentScope instead of letting them bubble up
  - Display user-friendly error message with navigation options (back/home)