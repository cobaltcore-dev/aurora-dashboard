---
"@cobaltcore-dev/aurora": minor
---

Add branding slots, appName prop, and pageFooter slot to AuroraApp.

- `slots.logo`: consumers can now supply a custom logo component rendered in the page header, replacing the default Aurora SVG
- `slots.pageFooter`: consumers can now supply a custom footer component rendered at the bottom of the page, replacing the default empty footer
- `appName`: string prop that replaces the hardcoded "Aurora" text in the header breadcrumb and logo title
