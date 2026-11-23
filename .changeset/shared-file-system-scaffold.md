---
"@cobaltcore-dev/aurora": minor
---

Add the catalog- and permission-gated Shared File System scope (Manila `sharev2`/`manilav2`) with a Shares/Share Networks/Security Services tab scaffold

Add the `sharedFileSystem.canUser` permission router; read actions use upstream Manila policy keys from an optional `shared-file-system.json`, and the scope stays hidden when that file is missing

Add the `shared-file-system` service key
