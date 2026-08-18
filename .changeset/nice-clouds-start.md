---
"@cobaltcore-dev/aurora": minor
---

Add Ceph S3 bucket lifecycle configuration management. Implements full CRUD operations for lifecycle rules including expiration policies, noncurrent version expiration, and multipart upload cleanup. 

Lifecycle rules are now managed via a dedicated "Lifecycle Rules" tab on the bucket detail page (accessed via `?view=lifecycle-rules`), using a DataGrid with per-rule edit/delete and multi-select bulk delete. Each mutation refetches and validates the configuration before saving. Deleting the last rule automatically removes the entire lifecycle configuration. Storage-class transitions configured outside Aurora are preserved but not editable in the UI.

The header menu actions for lifecycle rules have been removed in favor of the tab-based interface, consistent with the CORS rules architecture.

**Additional improvements in this PR:**
- Fix And-filter predicate counting to accept 2+ tags without other conditions (previously incorrectly rejected)
- Improve CORS rules table accessibility with proper aria-labels matching delete modal identifiers
- Replace O(n) rate-limiter cleanup with O(1) per-key timers in lifecycle/CORS/bucket-policy routers
