---
"@cobaltcore-dev/aurora": patch
---

Deleted project list view, keeping only the card view
Improved card view: responsive grid, ContentHeading for card titles
Replaced manual padding divs with Juno Container
Side nav collapsing text fixed via Juno update
SideNavigationItem manages its own open/close state internally, so Juno's chevron no longer desyncs from the open prop
Added routeTree.gen.ts to eslintignore
