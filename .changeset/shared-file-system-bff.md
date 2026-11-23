---
"@cobaltcore-dev/aurora": minor
---

- Add project-scoped, read-only `sharedFileSystem` queries for Manila shares, export locations, snapshots, replicas, share networks and security services
- Send a fixed `X-OpenStack-Manila-API-Version: 2.65` on every Manila call and parse responses tolerantly, including the pre-2.51 share-network subnet shape
- Check permissions server-side before every call, verify project ownership of detail reads, and strip the security-service password at the BFF
