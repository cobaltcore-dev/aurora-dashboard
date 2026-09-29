---
"@cobaltcore-dev/aurora": patch
---

- Change button variants from primary to default in Images modals (Add Property, Add Project Access, Add tag buttons)
- Fix EditImageDetailsModal not closing after save by awaiting onSave promise
- Add Cancel Upload button to CreateImageModal during file upload
- Reorder overflow menu items (bulk actions, single image row, detail page hamburger)
- Add separator after "Edit Metadata" in Images list hamburger menu
- Rename menu items to "Activate Image"/"Deactivate Image" and "Delete Image"
- Reorder menu: "Deactivate Image" now appears after "Manage Access" or "Set to Shared"
- Rework Edit Metadata modal to match Flavors: each add/edit/delete persists immediately via the tRPC client, no Save Changes button, no full-service reload during edits, queries refresh only on close
- New metadata entries appear on top, existing entries sorted A–Z
- Fix input field width in Edit Metadata modal to use full available space
- Rename "Sharing Details" tab to "Manage Access"
- Fix Add Project Access failing with validation error - pass currentProjectId to SharingDetailsTab
- Change section headings from ContentHeading to h2 in Images and Flavors detail views
