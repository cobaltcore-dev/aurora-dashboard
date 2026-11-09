---
"@cobaltcore-dev/aurora": patch
---

Floating IP fixes and improvements for second go-live

- Gate the floating IP list-row actions by permission, mirroring the details page: Edit Description, Attach, Detach and Release are hidden when the user lacks the matching permission, so a view-only user is left with just "Show Details"
- Connect the DNS Domain and DNS Name fields: entering one requires the other, validated live so the Allocate button reflects the error immediately
- Validate the DNS Name as a single hostname label (letters, digits and hyphens, not leading/trailing), with error precedence of required → format → length, and a clearer helptext explaining it is combined with the DNS domain to form the full record
- Add a "None" option to the DNS Domain select so the selection can be cleared back to the placeholder
- Disable the Allocate button whenever any field (required or optional) has a validation error, or while a server error from a previous attempt is present
- Let the user clear a failed-allocation server error by editing any field, instead of only by closing the modal (which lost their input)
- Surface Neutron's own reason on a failed allocation (400) instead of a generic message, so the user sees why the request was rejected
- Show the floating IP status as plain text in Title Case (Active / Down / Error) and remove the status icons in the list and details views
- Use a consistent `- -` empty-state placeholder (replacing the em dash) across the details view
- Refine field wording: shorten the list search placeholder to "Search…", and update help text, validation messages and field placeholders
- Give the Description textarea a visible label
- Keep the page title as a single top-level `h1` on the floating IP service and stop embedding the resource instance name in the modal title
- Expose `createPermissionRouter` and its `ServicePolicyConfig`, `PolicyMapping` and `EngineDef` types from `@cobaltcore-dev/aurora/server` for package consumers
