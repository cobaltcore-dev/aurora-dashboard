---
"@cobaltcore-dev/aurora": patch
---

Hide the Ceph (Object Storage) navigation item when the Ceph service is not available. The item is now gated on the service-discovery result and the route is guarded so direct navigation when the service is absent no longer leads to a broken view.
