---
"@cobaltcore-dev/aurora": patch
---

Improve image management UX with accessibility and consistency fixes

- Fix missing Route import causing runtime error in images list view
- Move "Manage Access" from tab navigation to overflow menu for better consistency with list view
- Reorder ImageMembersTable columns to match logical flow: Status, Project ID, Image ID, Actions
- Add member sorting: pending first, then accepted, then rejected, alphabetically within groups
- Remove redundant Accept/Reject actions from overflow menu (already in SharedImageBox)
- Add Reject button for accepted shared images in SharedImageBox
- Remove all placeholder text from image forms for cleaner UI
- Improve overflow menu item order to match list view pattern
