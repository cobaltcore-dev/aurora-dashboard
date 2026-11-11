---
"@cobaltcore-dev/aurora": patch
---

Key Manager UX improvements — validation, labels, and empty-state polish

- Add live character counters and `maxLength` to all limited text fields in Create Secret, Create Container, and Create Order modals (255 chars for name/algorithm/mode, 10,000 bytes for payload)
- Show validation error immediately on input when a field reaches its limit and disable the Create button while any error is present
- Add `min=1` validation to the Bit Length field in Create Secret modal
- Convert Payload Content Type in Create Order modal from a free text field to a Select with fixed options, hidden for the `asymmetric` order type
- Rename secrets list column headers to "Type" (secret type) and "Payload Content Type" (content type)
- Add a Created column to the secrets list and rename the sort label from "Created At" to "Created"
- Replace the `unnamed` placeholder with `"- -"` across all Key Manager list rows and the Container detail view
- Remove "Optional." prefix from name field helptext in Create Container and Create Order modals
- Move the container type description into the Type Select's `helptext`
