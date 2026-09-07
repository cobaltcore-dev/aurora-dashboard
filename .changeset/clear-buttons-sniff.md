---
"@cobaltcore-dev/aurora": minor
---

fix(network): resolve floating IP issues

- Fix crash after attach/detach actions
- Fix error state leaking between modals
- Fix long descriptions overflowing into kebab menu
- Redirect to detail page after creating a floating IP
- Ensure attach is the only primary action on the detail page
- Add toast notifications for all CRUD operations
- Rename "Preview" overflow action to "Show Details"
- Replace empty/loading/error states with Juno Status component
- Adjust sort-by fields
- Update wording in attach and edit modals
