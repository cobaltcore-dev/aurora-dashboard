---
"@cobaltcore-dev/aurora": patch
---

Improve shared image UX and fix metadata display

- Show "Show Details" first, then Accept/Reject for external shared images
- Don't show Accept/Reject for own images accidentally shared back to owner
- Remove header actions for external shared images (buttons already in SharedImageBox)
- Remove status colors in Manage Access modal
- Change Metadata section to use standard DescriptionList instead of two-column layout
