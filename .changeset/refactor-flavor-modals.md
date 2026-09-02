---
"@cobaltcore-dev/aurora": patch
---

Refactor Flavor EditSpecModal and ManageAccessModal to match the Image EditImageMetadataModal design pattern.

**EditSpecModal changes:**
- Add inline editing for existing specs (click to edit key/value)
- Implement batch save pattern (Save Changes button saves all at once)
- Use DescriptionList layout matching Images metadata modal
- Improve hasChanges detection with actual key/value comparison

**ManageAccessModal changes:**
- Use two-column layout with fixed "Project" key and editable Project ID value
- Implement batch save pattern (changes saved on modal confirm, not immediately)
- Use full-width input field for better usability
- Improve hasChanges detection with Set comparison of project IDs
