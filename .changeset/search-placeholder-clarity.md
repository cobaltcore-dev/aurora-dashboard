---
"@cobaltcore-dev/aurora": patch
---

Improve search placeholder text clarity across all search inputs

Updated search placeholders to explicitly indicate which fields are searchable:
- Projects: "Search projects by name or description..."
- Security Groups: "Search by name, description, or ID..."
- Security Group Rules: "Search by description, protocol, or ethertype..."
- RBAC Policies: "Search by tenant or action..."
- Floating IPs: "Search by IP address, description, or network ID..."
- Images: "Search by name..."
- Flavors: "Search by name, ID, or description..."
- Buckets, Containers, Objects: "Search by name..."
- CORS/Lifecycle Rules: "Search by rule ID..."

All placeholders now use consistent "..." formatting.
