---
"@cobaltcore-dev/aurora": minor
---

- Add the catalog- and permission-gated Volumes scope with a Volumes/Snapshots tab scaffold
- Add project-scoped Cinder volume and snapshot read queries, complete pagination, and scoped snapshot filtering
- Keep Cinder permissions independent and fail closed when block storage policy configuration is missing
- Verify detail ownership for all roles and gate each route on its own read capability
- Resolve usable project-scoped v3 endpoints before exposing the Volumes scope
- Use Aurora's shared route errors and inline loading and access-denied states
