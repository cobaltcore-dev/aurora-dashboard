---
"@cobaltcore-dev/aurora": patch
---

feat(portal): flavor and image detail/list UI improvements

- Images: show More Actions button for shared images regardless of member status; add Accept action for pending images in detail view
- Images: render image ID and owner project ID with ClipboardText for one-click copy
- Flavors: show "Edit Metadata" label when user can manage specs, "Metadata" when view-only; hide item when no spec permissions
- Flavors: fetch and propagate flavor_specs permissions (list/create/delete) from list view through to list row and modal
- Flavors: list row popup menu now uses default icon toggle (matching Images style) and passes canEdit to EditSpecModal
