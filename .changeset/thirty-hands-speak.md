---
"@cobaltcore-dev/aurora": minor
---

Add an overflow actions menu to the Swift in-container objects page, mirroring the Ceph bucket page's header/actions position. The menu exposes Manage Access, Preview and Edit metadata, Empty Container, and Delete Container, reusing the existing modals from the Swift container list page but now wired with real container metadata (object count / size) fetched via `getContainerMetadata` instead of a placeholder. Deleting a container while browsing its objects now navigates back to the container list instead of leaving the user on a now-dead page.

**Additional improvements in this PR:**
 - Renamed several Swift storage action labels for consistency across container and object row menus and their confirmation modals (e.g. "Delete" → "Delete Object" / "Delete Container", "Copy" → "Copy Object", "Move/Rename" → "Move/Rename Object", "Edit Metadata" → "Edit Object Metadata", "Share URL" → "Share Object URL")
 - Reorganized the Swift objects page toolbar: "Create Folder" moved into a new overflow menu, "Upload Object" is now the primary action

