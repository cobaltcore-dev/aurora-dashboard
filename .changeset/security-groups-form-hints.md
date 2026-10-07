---
"@cobaltcore-dev/aurora": minor
---

Added comprehensive help hints and validation to all Security Groups form inputs (Create/Edit Security Group, Add Rule, Share Security Group). Every input now shows validation rules and what empty values mean. Fixed issues found during Elektra cross-check: empty Remote Security Group now required, IPv6 CIDR rules work correctly, current group can be selected as remote, failed creates keep the modal open, error toasts removed (errors shown only in modals), default group Edit/Delete hidden, and added Remote column to rules table showing CIDR, group name, or "Any".
