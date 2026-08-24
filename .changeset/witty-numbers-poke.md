---
"@cobaltcore-dev/aurora": patch
---

Swift: reword the container quota validation error to a positive instruction
("Must be a whole number, 0 or greater") instead of the previous
double-negative phrasing, and reject non-integer quota values (both object
count and total size), so decimals like "1.5" no longer pass validation.
