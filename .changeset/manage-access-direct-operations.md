---
"@cobaltcore-dev/aurora": patch
---

- Change ManageAccessModal from bulk save to direct add/delete operations
- Add toast notifications for access add/remove success and error
- Show inline validation errors on input field instead of separate Message component
- Remove Save Changes and Cancel buttons - changes apply immediately
- Add progress indicators on Add and Delete buttons during operations
- Disable operations while any add/delete is in progress
- Fix property_key translation to show "Property Key" instead of "property_key"
