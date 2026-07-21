---
"@cobaltcore-dev/aurora": patch
---

 Add StorageNotFound component with proper error handling for invalid storage types
  - Extract serviceAvailability logic to reusable utility file (-components/utils/serviceAvailability.ts)
  - Add StorageNotFound component to display 404 error when storage type/provider is not available
  - Refactor storage routes ($provider/$storageType/index.tsx) to use new utility and render StorageNotFound on invalid storage
