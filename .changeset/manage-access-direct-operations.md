---
"@cobaltcore-dev/aurora": patch
---

- Change ManageAccessModal from bulk save to direct add/delete operations
- Add toast notifications for access add/remove success and error
- Show validation errors in Message component above Add Project button
- Remove Save Changes and Cancel buttons - changes apply immediately
- Add progress indicators on Add and Delete buttons during operations
- Disable operations while any add/delete is in progress
- Fix property_key translation to show "Property Key" instead of "property_key"
- Change "No metadata properties found" to "No Metadata Properties Found" (title case)
- Disable Create Flavor button until all required fields are filled and valid
- Force word break on metadata keys and values in flavor detail view and modal to prevent overflow
- Shorten Public Flavor helptext in Create Flavor modal
