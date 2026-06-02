# PR: Fix setPageTitle / Breadcrumb refactor

## What was done

- Replaced the `setPageTitle` custom event system (was causing React "setState during render" warnings) with TanStack Router's `head()` option — each route declares its own page title, `HeadContent` renders it to `<title>`
- Refactored breadcrumbs: each route now declares `sectionCrumb` / `crumb` in `staticData`, `ProjectInfoBox` just maps over active matches — no more lookup tables or if/else trees
- Ceph vs Swift label now correctly derived from `match.params.provider`
- Section labels (Compute / Network / Storage / Services) are plain text — no navigation since overviews are not yet implemented
- Fixed nested `<button>` warning in images list (`PopupMenuToggle as="div"`)

## How to test

1. Navigate to any list page (Images, Flavors, Security Groups, Floating IPs, Containers, PCA) — breadcrumb shows correct section + service labels, neither clickable
2. Navigate to a detail page — breadcrumb shows section (plain) > service (clickable, goes back to list) > item name (active)
3. Switch between Swift and Ceph storage — breadcrumb shows "Object Storage (Swift)" / "Object Storage (Ceph)" accordingly
4. Check browser console — no "setState during render" or nested `<button>` warnings
5. Click project name in breadcrumb — navigates to project overview
