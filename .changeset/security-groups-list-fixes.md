---
"@cobaltcore-dev/aurora": patch
---

Fixed the Security Groups `Shared` filter returning groups from all projects for admin users (e.g. several `default` groups). Filtered lists are now always a subset of the unfiltered list, and sorting/search behave the same with and without filters. Aligned the list's DataGrid header with the Juno pattern and simplified the Name cell markup. `network.securityGroup.list` no longer accepts `tenant_id`; the scope always comes from `project_id`.
