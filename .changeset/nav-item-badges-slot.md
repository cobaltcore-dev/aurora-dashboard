---
"@cobaltcore-dev/aurora": minor
---

Add new consumer extension points and service filtering:

- `login` slot — replaces the default login form; useful for OIDC environments
- `serviceBadge` slot — renders inline next to each service label in the side nav and project home cards; receives `auroraContext.currentService`
- `servicePageActions` slot — renders beside the service page title in `ContentHeader`; receives `auroraContext.currentService`
- `projectsBanner` slot — renders below the "Projects" heading on the projects list page
- `projectOverviewBanner` slot — renders below the project description on the project overview page
- `enabledServices` prop — whitelist of service keys; when provided, only listed services appear in the nav and project home cards
- Refactor `SideNavBar` into `buildNavSections` utility for better testability
