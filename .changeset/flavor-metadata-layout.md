---
"@cobaltcore-dev/aurora": patch
---

- Fix 50/50 width split in Flavor metadata DescriptionLists
- Fix value input to use full available width in EditSpecModal
- Fetch extra specs separately in FlavorDetailsView to display metadata
- Sort by Input width is now wider to allow all children to fit in one row
- Remove view-only "Metadata" button - metadata now always visible in Details section
- Simplify EditSpecModal to only support editing (not viewing)
- Remove primary styling and icon from "Add Property" button in EditSpecModal
- Remove primary styling and icon from "Add Project" button in ManageAccessModal
- Remove background color from "Add Project" button container
- Hide "Manage Access" menu item for public flavors instead of showing disabled
- Fix "Manage Access" to only show when user has add_project or remove_project permissions
- Use Message component instead of errortext for validation errors in ManageAccessModal
- Improve Create Flavor modal with FormSections, helper text, and placeholders
- Reorganize flavor details into two-column layout with Flavor Information and Hardware Specifications
- Refactor EditSpecModal to save/delete metadata immediately instead of bulk save
- Add toast notifications for metadata create/update/delete operations
- Show validation errors as Message component above inputs instead of inline errortext
- Disable key editing in metadata - keys are read-only, only values can be edited
- Remove Cancel button from EditSpecModal (only Close button remains)

