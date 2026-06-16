---
"@cobaltcore-dev/aurora": minor
"@cobaltcore-dev/dashboard": minor
---

Migrate policy files from YAML to JSON and unify storage policies

- Convert all policy files from YAML to JSON format (compute, image, networking, storage)
- Unify Swift and Ceph policies into single storage.json with consistent Swift terminology
- Add startup validation for engine configuration in createPermissionRouter
- Update router definitions to use .json filenames instead of .yaml

Benefits:
- Better tooling support (schema validation, editor autocomplete)
- Consistent naming: storage:containers:*, storage:objects:*, storage:folders:*
- Backend-agnostic API (UI doesn't distinguish Swift vs Ceph)
- Fewer files to maintain (4 instead of 6 policy files)
- Errors caught at startup instead of runtime
