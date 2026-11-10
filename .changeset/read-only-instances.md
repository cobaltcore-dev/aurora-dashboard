---
"@cobaltcore-dev/aurora": patch
---

- Add a read-only Instances section under Compute for listing and inspecting Nova servers
- Instances list with a Power State column, filters for power state and availability zone, and a free-text search that matches name, id, flavor, image id, created and IP
- Instance detail view with a two-column layout, metadata, tags in the general data, and a per-network Addresses sub-section
- Link the flavor name to the flavor detail, and resolve the image name to a link to the image detail; in the list, when the image is not accessible in the project the column shows "- -" instead of a dead link. The detail view shows the image name (linked when resolvable) and the raw image id (copyable) as separate rows. Add an Instances landing-page card. The Metadata section is hidden when the instance has no metadata
- Show "Booted from volume" for volume-booted instances instead of an empty image id
- Capture Nova namespaced address keys (MAC, type), request a supported servers microversion (never above the deployment max), and follow servers_links pagination; surface Nova errors and truncated/invalid responses instead of a misleading empty list
- Gate the Instances nav entry and routes on the compute/nova service catalog
