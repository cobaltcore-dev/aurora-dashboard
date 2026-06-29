---
"@cobaltcore-dev/aurora": minor
---

Add JsonEditor component for bucket policy editing

- New `JsonEditor` component with line numbers and smart indentation
- BucketPolicyModal now uses JsonEditor with improved UX:
  - Auto-selects template when loaded policy matches a predefined template
  - Empty policy field deletes the policy from the bucket
  - Save button disabled when no changes made
- Backend validation improvements:
  - Strict schema validation rejects unknown fields
  - Added NotPrincipal, NotAction, NotResource support
  - Human-readable error messages (Statement 1 instead of Statement.0)
