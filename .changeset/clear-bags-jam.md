---
"@cobaltcore-dev/aurora": patch
---

Anchor the object storage tables' height to the page footer's actual position, so a custom footer of any height is accounted for. Previously a fixed allowance for the footer meant a taller custom footer overlapped the last rows and a shorter one left a gap.
