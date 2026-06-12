---
"@cobaltcore-dev/aurora": patch
---

feat(portal): compute image and flavor UI improvements

**Images**
- Detail page: More Actions button now appears for all shared images regardless of member status
- Detail page: Accept action added for pending shared images; SharedImageBox retains inline Accept/Reject buttons
- Detail page: Image ID and Owner Project ID rendered with ClipboardText for one-click copy
- Detail page: spacing fixes for SharedImageBox and actions row

**Flavors**
- Detail page: Metadata button visible for users with view-only spec access (`flavor_specs:list`); labelled "Edit Metadata" when editable
- List view: `flavor_specs` permissions fetched and propagated to list row and EditSpecModal
- List view: Metadata item gated on spec permissions; "Edit Metadata" vs "Metadata" label based on edit rights
- List view: popup menu uses default icon toggle (consistent with Images); Manage Access disabled for public flavors
