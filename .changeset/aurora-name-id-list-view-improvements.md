---
"@cobaltcore-dev/aurora": patch
---

- Apply the "Name / ID" column pattern consistently across Compute (Images, Flavors, Instances), Network (Networks, Ports, Routers, Security Groups, Subnets) and their detail sub-tables: the name on top (or "- -" when empty) with the ID beneath as a subdued copy affordance, extracted into a shared `NameIdCell`.
- Cross-link the name (or the ID when the name is empty) to the related resource's detail page in network sub-tables; the ID copy icon reveals on hover over the whole line.
- Title-case the "Sort By" and "Filter By" toolbar labels; use "Search…" as the search placeholder in network list views.
- Instances: show the instance status in the list with the power state as a hover tooltip, and surface Nova's fault reason in an error tooltip (list) and an error message with expandable details (detail view).
- Images: move item count and last-updated info into the DataGrid header's state zone and render the member-status filters as button tabs.
- Reorder the Network side-navigation (Networks, Routers, Fixed IPs / Ports, Floating IPs, Security Groups) and default the Networks detail view to the Subnets tab.
- Volumes/Snapshots: link only the name (not the whole row) when it cross-links, keep the ID copyable, and show the source volume as a copyable, linked Name / ID.
