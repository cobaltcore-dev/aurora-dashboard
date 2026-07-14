---
"@cobaltcore-dev/aurora": patch
---

fix(aurora): fix CreateBucketModal not rendering when bucket list is empty

Restructured BucketTableView to conditionally render empty state or table
content, ensuring CreateBucketModal can be displayed regardless of bucket
list state. Added test coverage for modal rendering with empty bucket list.