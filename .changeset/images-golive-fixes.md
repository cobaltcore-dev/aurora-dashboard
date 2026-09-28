---
"@cobaltcore-dev/aurora": patch
---

- Change button variants from primary to default in Images modals (Add Property, Add Project Access, Add tag buttons)
- Fix EditImageDetailsModal not closing after save by awaiting onSave promise
- Add Cancel Upload button to CreateImageModal during file upload
- Reorder overflow menu items (bulk actions, single image row, detail page hamburger)
- Rename "Sharing Details" tab to "Manage Access"
- Fix Add Project Access failing with validation error - pass currentProjectId to SharingDetailsTab
- Change section headings from ContentHeading to h2 in Images and Flavors detail views
