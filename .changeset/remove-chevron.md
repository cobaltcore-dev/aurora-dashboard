---
"@cobaltcore-dev/aurora": patch
---

Remove non-functional chevron from project service cards
Fix sort/filter inconsistencies across all lists:
- Security Groups: remove "Project id" sort option (not in table)
- Images: remove "Updated At" sort option, rename "Name" to "Image Name"
- Flavors: match sort labels to table headers (vCPU, RAM (MiB), Root Disk (GiB), Swap (MiB))
- Swift Containers: rename "Name" to "Container Name"
- Ceph Buckets: rename "Name" to "Bucket Name"
