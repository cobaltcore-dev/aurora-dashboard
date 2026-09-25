---
"@cobaltcore-dev/aurora": patch
---

- Add Nova API version detection for flavor description field (requires microversion 2.55+)
- Fix Nova microversion parsing to handle versions with minor >= 100 (e.g., 2.100)
- Remove empty metadata padding in flavor edit modal
- Fix controlled/uncontrolled input warning for rxtx_factor field
