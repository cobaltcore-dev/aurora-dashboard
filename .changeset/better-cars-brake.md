---
"@cobaltcore-dev/aurora": minor
---

Gate Ceph/S3 Object Storage mutations behind `storage.canUser` permission checks, client-side, matching every other domain in the app. The following 11 mutation actions are now gated: generating a presigned/share URL for an object, deleting or restoring an object version, toggling bucket versioning, updating or deleting a bucket policy, creating/editing or deleting a CORS rule, creating/editing or deleting a lifecycle rule, and creating S3 (EC2) credentials. Bucket/object/folder create-delete-empty actions and the previously ungated Ceph bulk-action TODOs are also now wired to real permissions instead of hardcoded `true`.

Read/list/view/download actions (bucket and object listing, downloading, viewing CORS/lifecycle/policy config, viewing version history) are **not** gated  this matches the existing convention across the rest of the app (RBAC differentiates who can change things, not who can see things).

Operators who maintain a custom `storage.json` policy file need to add the 11 new rules for the gated actions to keep working as before: `storage:object_share`, `storage:object_version_delete`, `storage:object_version_restore`, `storage:container_versioning_update`, `storage:container_policy_update`, `storage:container_policy_delete`, `storage:container_cors_update`, `storage:container_cors_delete`, `storage:container_lifecycle_update`, `storage:container_lifecycle_delete`, `storage:s3_credential_create`. If any of these rules is missing, the corresponding mutation controls simply render hidden (fail-closed)  there is no server error or crash.
