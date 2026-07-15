# @cobaltcore-dev/dashboard

## 1.2.5

### Patch Changes

- Updated dependencies [45e8c43]
  - @cobaltcore-dev/aurora@0.20.3

## 1.2.4

### Patch Changes

- Updated dependencies [6dd15fd]
  - @cobaltcore-dev/aurora@0.20.2

## 1.2.3

### Patch Changes

- Updated dependencies [7549dec]
- Updated dependencies [04cc26d]
  - @cobaltcore-dev/aurora@0.20.1

## 1.2.2

### Patch Changes

- Updated dependencies [c55b535]
- Updated dependencies [8679d8a]
  - @cobaltcore-dev/aurora@0.20.0

## 1.2.1

### Patch Changes

- Updated dependencies [622ad68]
  - @cobaltcore-dev/aurora@0.19.1

## 1.2.0

### Minor Changes

- 16440c1: Add CSR parsing and certificate details enhancements for Clavis PCA workflows.

### Patch Changes

- Updated dependencies [194a480]
- Updated dependencies [4518889]
  - @cobaltcore-dev/aurora@0.19.0

## 1.1.18

### Patch Changes

- Updated dependencies [d2cc53d]
- Updated dependencies [2f8cca6]
- Updated dependencies [914411a]
  - @cobaltcore-dev/aurora@0.18.0

## 1.1.17

### Patch Changes

- Updated dependencies [21584e0]
  - @cobaltcore-dev/aurora@0.17.1

## 1.1.16

### Patch Changes

- Updated dependencies [2e9d83f]
- Updated dependencies [1376e9f]
  - @cobaltcore-dev/aurora@0.17.0

## 1.1.15

### Patch Changes

- Updated dependencies [df25d7c]
- Updated dependencies [4291071]
  - @cobaltcore-dev/aurora@0.16.0

## 1.1.14

### Patch Changes

- Updated dependencies [3966415]
  - @cobaltcore-dev/aurora@0.15.0

## 1.1.13

### Patch Changes

- Updated dependencies [1205d67]
  - @cobaltcore-dev/aurora@0.14.1

## 1.1.12

### Patch Changes

- Updated dependencies [219ed22]
  - @cobaltcore-dev/aurora@0.14.0

## 1.1.11

### Patch Changes

- Updated dependencies [40ad7cb]
  - @cobaltcore-dev/aurora@0.13.1

## 1.1.10

### Patch Changes

- Updated dependencies [532cf06]
- Updated dependencies [16a5a52]
- Updated dependencies [f67c54f]
  - @cobaltcore-dev/aurora@0.13.0

## 1.1.9

### Patch Changes

- Updated dependencies [4abf513]
  - @cobaltcore-dev/aurora@0.12.1

## 1.1.8

### Patch Changes

- e070437: feat(server): replace crossDomainCookie with explicit cookieDomain config

  **Breaking change:** `crossDomainCookie` and `ENABLE_CROSS_DASHBOARD_COOKIE` are removed.

  Use the new `cookieDomain` config option (or `COOKIE_DOMAIN` env var) to explicitly set
  the cookie domain for cross-subdomain sharing (e.g., `.example.com`).

  When not set, cookies are host-specific (no cross-subdomain sharing).

  Also changes `SameSite` cookie attribute from `strict` to `lax` for consistency with
  other dashboards and better UX when following external links.

- Updated dependencies [e070437]
- Updated dependencies [63e7834]
- Updated dependencies [94552b7]
- Updated dependencies [63e7834]
  - @cobaltcore-dev/aurora@0.12.0

## 1.1.7

### Patch Changes

- Updated dependencies [8689aa9]
- Updated dependencies [c67430d]
- Updated dependencies [32223ac]
- Updated dependencies [4325092]
- Updated dependencies [4325092]
- Updated dependencies [bd484d5]
  - @cobaltcore-dev/aurora@0.11.0

## 1.1.6

### Patch Changes

- Updated dependencies [783d7f0]
- Updated dependencies [e232ad0]
- Updated dependencies [7a5acd1]
  - @cobaltcore-dev/aurora@0.10.0

## 1.1.5

### Patch Changes

- Updated dependencies [00bfb76]
  - @cobaltcore-dev/aurora@0.9.0

## 1.1.4

### Patch Changes

- Updated dependencies [bae772e]
  - @cobaltcore-dev/aurora@0.8.1

## 1.1.3

### Patch Changes

- Updated dependencies [2182bff]
- Updated dependencies [ae3a00b]
- Updated dependencies [ce6bb7a]
- Updated dependencies [e89fdbb]
- Updated dependencies [874b07d]
  - @cobaltcore-dev/aurora@0.8.0

## 1.1.2

### Patch Changes

- Updated dependencies [662f071]
  - @cobaltcore-dev/aurora@0.7.0

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
