---
"@cobaltcore-dev/aurora": patch
---

- Exclude pending/rejected shared images from All Images view
- Show permission-based restrictions in bulk action modals
- Validate project existence when sharing images
- Add 255-char limit to image names (create + update)
- Enable direct page navigation (e.g. `?page=6`)
- Disable bulk actions button when no items selected
- Add context-specific empty state messages
- Use default text color and size for restriction notices in bulk action modals
- Show a "- -" placeholder for empty values in detail views
- Explain why reserved/read-only metadata cannot be edited instead of showing a generic error
- Keep Create Image disabled while any field (including optional) has a validation error
- Reject scientific notation (e.g. `1e5`) in Min Disk / Min RAM; treat empty as 0
- Clarify sharing error: a project may just not be found (sharing to projects you can't access is allowed)
