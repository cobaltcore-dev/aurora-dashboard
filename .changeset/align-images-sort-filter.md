---
"@cobaltcore-dev/aurora": patch
---

- Align Images list sort and filter options with table column order
- Consistent empty-value representation ("- -") in Image detail and metadata lists
- Use Juno ProgressBar for image upload progress
- Refresh image data after metadata edits so reopening the modal shows current values
- Validate Edit Image fields on input, disabling Save until corrected
- Treat empty optional number fields as valid in Edit Image, matching Create
- Reduce Images list pagination to 30 items per page
