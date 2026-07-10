---
"@cobaltcore-dev/aurora": patch
---

fix(aurora): use location.searchStr to preserve exact redirect URL

- Replace URLSearchParams re-serialization with location.searchStr
- Preserve hash fragment in redirect path
- Avoid edge cases with query param ordering and repeated keys
