# @cobaltcore-dev/dashboard

## 1.1.1

### Patch Changes

- Updated dependencies [8185a39]
- Updated dependencies [8185a39]
- Updated dependencies [0f4de1b]
- Updated dependencies [96fe087]
- Updated dependencies [9f9015a]
- Updated dependencies [aa91ba8]
  - @cobaltcore-dev/aurora@0.6.0

## 1.1.0

### Minor Changes

- 3536c95: Migrate policy files from YAML to JSON and unify storage policies
  - Convert all policy files from YAML to JSON format (compute, image, networking, storage)
  - Unify Swift and Ceph policies into single storage.json with consistent Swift terminology
  - Add startup validation for engine configuration in createPermissionRouter
  - Update router definitions to use .json filenames instead of .yaml

  Benefits:
  - Better tooling support (schema validation, editor autocomplete)
  - Consistent naming: storage:containers:_, storage:objects:_, storage:folders:\*
  - Backend-agnostic API (UI doesn't distinguish Swift vs Ceph)
  - Fewer files to maintain (4 instead of 6 policy files)
  - Errors caught at startup instead of runtime

### Patch Changes

- Updated dependencies [3536c95]
- Updated dependencies [2db15e8]
- Updated dependencies [33ac5e9]
- Updated dependencies [fe78936]
- Updated dependencies [9b00ac4]
- Updated dependencies [3a5a69b]
- Updated dependencies [42471fb]
- Updated dependencies [c954a3e]
- Updated dependencies [f73a00f]
- Updated dependencies [42471fb]
  - @cobaltcore-dev/aurora@0.5.0

## 1.0.6

### Patch Changes

- Updated dependencies [711736c]
- Updated dependencies [fc1bc08]
- Updated dependencies [641c699]
- Updated dependencies [fc861d5]
- Updated dependencies [5ab571f]
- Updated dependencies [e5d39a9]
  - @cobaltcore-dev/aurora@0.4.0

## 1.0.5

### Patch Changes

- Updated dependencies [a046b17]
  - @cobaltcore-dev/aurora@0.3.1

## 1.0.4

### Patch Changes

- Updated dependencies [ddd8b37]
- Updated dependencies [4f41ac0]
  - @cobaltcore-dev/aurora@0.3.0

## 1.0.3

### Patch Changes

- Updated dependencies [98db18f]
  - @cobaltcore-dev/aurora@0.2.2

## 1.0.2

### Patch Changes

- Updated dependencies [f14ab83]
- Updated dependencies [a194c98]
- Updated dependencies [717d53f]
  - @cobaltcore-dev/aurora@0.2.1

## 1.0.1

### Patch Changes

- Updated dependencies [b8a4cd7]
  - @cobaltcore-dev/aurora@0.2.0
