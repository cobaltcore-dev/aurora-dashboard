---
"@cobaltcore-dev/aurora": patch
---

feat(portal): compute image and flavor UI improvements

**Images**
- Detail page: More Actions button now appears for accepted shared images (pending/suggested images keep inline Accept/Reject via SharedImageBox and do not show the menu) — closes #902
- Detail page: Accept action added for pending shared images in More Actions; SharedImageBox retains inline Accept button for the detail body
- Detail page: Image ID and Owner Project ID rendered with ClipboardText for one-click copy
- Detail page: spacing fixes for SharedImageBox and actions row

**Flavors**
- Detail page: users with view-only spec access (`flavor_specs:list`) see a **Metadata** button; users with create/delete access see **Edit Metadata** — closes #907
- Detail page: Metadata and Manage Access moved into the More Actions menu (action parity with list row)
- List view: `flavor_specs` permissions fetched and propagated to list row and EditSpecModal
- List view: Metadata item gated on spec permissions; view-only users see **Metadata**, editors see **Edit Metadata**
- List view: new **Access Type** column shows Public or Private status for each flavor — closes #908
- List view: popup menu uses default icon toggle (consistent with Images); Manage Access disabled for public flavors
- Manage Access modal: Flavor ID column removed for a simpler two-column layout — closes #909

**Error handling**
- Overview, Images list, and Flavors list wrapped with ErrorBoundary to catch policy file mismatch errors that reject `canUser`/data promises via `React.use()`
