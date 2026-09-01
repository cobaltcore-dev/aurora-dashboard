---
"@cobaltcore-dev/aurora": patch
---

Refactor Flavor EditSpecModal and ManageAccessModal to match the Image EditImageMetadataModal design pattern.

**EditSpecModal changes:**
- Add inline editing for existing specs (click to edit key/value)
- Implement batch save pattern (Save Changes button saves all at once)
- Add confirm-delete pattern with 3-second timeout
- Use DescriptionList layout matching Images metadata modal

**ManageAccessModal changes:**
- Use two-column layout with fixed "Project" key and editable Project ID value
- Implement batch save pattern (changes saved on modal confirm, not immediately)
- Simplify UI by removing confirm-delete pattern (unnecessary with batch save)
- Use full-width input field for better usability
