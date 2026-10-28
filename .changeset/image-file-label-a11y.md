---
"@cobaltcore-dev/aurora": patch
---

Use the Juno Label component (with required indicator) for the Create Image modal's file upload field so its accessible name and required semantics match the other form fields. Added line breaks between the sentences in the image list empty-state messages. Image table cells now use the new DataGrid `textContain` prop for overflow handling (truncate the name, break long IDs). Bumped juno-ui-components to 9.7.2.
