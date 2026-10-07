---
"@cobaltcore-dev/aurora": minor
---

Added a "Manage Credentials" modal for Ceph S3 Object Storage, reachable from the bucket list's "More Actions" menu, the "Setup Required" empty state and the "S3 Authentication Failed" screen. It lists the user's EC2 access keys in the project, reveals a key's secret on demand, creates and deletes keys, and shows the S3 endpoint and region.

- New procedure `storage.ceph.ec2Credentials.reveal`; `storage.ceph.containers.status` now also returns `endpoint` and `region`.
- `storage.ceph.ec2Credentials.create` no longer returns `secret`; read it through `reveal`.
- New permission key `storage:credentials:delete`. Operators with a custom `storage.json` should add `"storage:credential_delete": "rule:storage_viewer"`, otherwise the delete action stays hidden.
- `canUser` resolves a rule missing from the policy file to `false` for that key only, instead of failing the whole batch.
- When a user holds several keys, Ceph requests are signed with the same one every time (lowest credential id).
