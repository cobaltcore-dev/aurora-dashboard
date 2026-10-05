---
"@cobaltcore-dev/aurora": patch
---

Improve image management UX with accessibility and consistency fixes

- Move "Manage Access" from tab navigation to overflow menu for better consistency with list view
- Reorder ImageMembersTable columns to match logical flow: Status, Project ID, Image ID, Actions
- Add member sorting: pending first, then accepted, then rejected, alphabetically within groups
- Remove redundant Accept/Reject actions from overflow menu (already in SharedImageBox)
- Add Reject button for accepted shared images in SharedImageBox
- Remove all placeholder text from image forms for cleaner UI
- Improve overflow menu item order to match list view pattern
- Show "Show Details" first, then Accept/Reject for external shared images
- Don't show Accept/Reject for own images accidentally shared back to owner
- Remove header actions for external shared images (buttons already in SharedImageBox)
- Remove status colors in Manage Access modal
- Change Metadata section to use standard DescriptionList instead of two-column layout
