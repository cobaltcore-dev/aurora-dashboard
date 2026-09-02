---
"@cobaltcore-dev/aurora": patch
---

Storage: fix incorrect DataGrid usage in the virtualized Swift and Ceph tables.
The virtualized body now renders as a single grid wrapper with row children
instead of one grid per row, improving performance, layout, and accessibility.
