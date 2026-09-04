---
"@cobaltcore-dev/aurora": patch
---

Swift: container and object "last modified" times now render in the viewer's
local timezone. Swift returns these timestamps as UTC without a zone
designator, which were previously parsed as local time and shown with an
offset.
