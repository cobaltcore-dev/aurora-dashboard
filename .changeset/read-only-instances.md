---
"@cobaltcore-dev/aurora": patch
---

- Add a read-only Instances section under Compute for listing and inspecting Nova servers
- Instances list with Status column, search, sort, and multi-value filters (status, AZ, flavor, image, key name, locked), filtered and sorted in the BFF like Images
- Instance detail view with a two-column layout and a per-network Addresses sub-section
- Capture Nova namespaced address keys (MAC, type), request the servers microversion, and follow servers_links pagination
- Gate the Instances nav entry and routes on the compute/nova service catalog
