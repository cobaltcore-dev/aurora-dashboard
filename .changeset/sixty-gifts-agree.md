---
"@cobaltcore-dev/aurora": patch
---

Fix Swift Object Storage UI findings from UX review (#916)

**Destructive modals — high-risk pattern**

Applied `<Message variant="danger">` + type-to-confirm `<TextInput>` to all irreversible bulk actions:

- `DeleteFolderModal`: danger Message, type `"delete"` to confirm
- `DeleteObjectsModal`: danger Message, type `"delete"` to confirm, count-aware title (`Delete # Object / Delete # Objects`)
- `EmptyContainersModal`: danger Message, type `"empty"` to confirm, count-aware title and bulk menu label (`Empty # Containers`), `<DescriptionList>` for container names, removed "Please note:" prefix

**GenerateTempUrlModal**

- Title `"Share object:"` → `"Share URL:"`, row menu item renamed to match
- "No Temp URL key" warning wrapped in `<Message variant="warning">`
- Generate URL button disabled when no key is configured
- Cancel label: `"Close"` → `"Cancel"`

**MoveRename and Copy modals**

- Title capitalisation: `"object"` → `"Object"`
- Target path `<TextInput readOnly>` replaced with plain `<p>`
- Destination picker filters to folders only
- New folder form: placeholder, button order, and dismiss label (`"Cancel"` → `"Discard"`) corrected

**ManageContainerAccessModal**

- Title capitalisation: `"container"` → `"Container"`, `font-mono` removed from container name
- "Before proceeding" warning wrapped in `<Message variant="warning">`
- Redundant intro paragraph removed; "Changes take effect immediately" note added above Save
- ACL preview rows replaced with `<DescriptionList>`
- Preview headings renamed to `"Read ACLs — Preview"` / `"Write ACLs — Preview"`

**Bulk action scoping**

- Folder rows show a disabled `<Checkbox>` with a `<Tooltip>` instead of an empty cell
- Bulk delete button uses count-aware label (`Delete # Object / Delete # Objects`)

**DataGrid header cleanup**

- Select-all header checkbox removed from `ContainerTableView` and `ObjectsTableView`
- Dead `allSelected` / `handleSelectAll` logic removed

**Monospace removal**

- `font-mono` removed from all user-defined name/path values across Swift views
