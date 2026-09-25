---
"@cobaltcore-dev/aurora": patch
---

Fix the Ceph bucket policy editor rejecting and hiding policies that use Ceph's multi-tenancy principals. Principal ARNs were validated against the AWS grammar, which requires a 12-digit account ID, while RGW puts a tenant (the Keystone project UUID), an RGW account ID or nothing in that position — so no real principal passed. Because the same validation also ran when reading, an existing, actively enforced policy failed to load at all and the editor showed an error instead of the document. Reads now always return the stored policy text, principal syntax is left to RGW, and Resource ARNs may be tenant-qualified (`arn:aws:s3::TENANT:bucket`).
