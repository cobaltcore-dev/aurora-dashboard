---
"@cobaltcore-dev/aurora": patch
---

- Add a read-only Instances section under Compute for listing and inspecting Nova servers
- Instances list with a Power State column, filters for power state and availability zone, and a free-text search that matches name, id, flavor, image id, created and IP
- Instance detail view with a two-column layout, metadata, tags in the general data, and a per-network Addresses sub-section
- Link the flavor name to the flavor detail, and resolve the image name to a link to the image detail (lazily on list hover, eagerly on the detail view); when an image is not accessible in the project the id is shown as plain text. The Metadata section is hidden when the instance has no metadata
- Show "Booted from volume" for volume-booted instances instead of an empty image id
- Capture Nova namespaced address keys (MAC, type), request the servers microversion, and follow servers_links pagination
- Gate the Instances nav entry and routes on the compute/nova service catalog
