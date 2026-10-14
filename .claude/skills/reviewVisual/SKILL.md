---
name: reviewVisual
description: Visual review of Aurora UI screenshots against the 12-point UX checklist. Called by review-ui. Do not invoke directly unless you only have screenshots and no code.
argument-hint: <screenshot(s) in context | path(s)> [page-type hint]
---

# reviewVisual

Input: one or more screenshots already in context (pasted by user) or file paths passed as arguments, plus an optional page-type hint from the caller.

**Before starting the checklist**, load the `sap_juno_appkit` skill. Its UX non-negotiables and quick decision index are the authoritative reference for items 5–8 and 12 below. If a specific prop, variant, or rule is needed beyond what `sap_juno_appkit` covers, dispatch the `sap_juno_lookup` agent.

If the caller passed a list of Juno components marked "changed" (from a freshness check), treat `sap_juno_appkit`'s cached values for _those_ components as possibly stale — dispatch `sap_juno_lookup` for a live read before judging them, rather than trusting the cache.

Work through every item below in order. For each item output one line: ✅ pass, ❌ finding, ⚠️ risk, or ➖ not applicable (with a one-line reason). Never skip an item silently.

---

## 1. Page type

Identify what kind of page this is: **list / landing**, **entity detail**, **modal**, **drawer**, **form**, **empty state**, or other. State it explicitly — the rest of the checklist depends on it. If the caller supplied a hint, confirm or correct it.

## 2. Breadcrumb and information architecture

Is a breadcrumb present? Does it correctly reflect where this page sits in the app hierarchy? Check that parent labels match what the app calls those sections elsewhere in the screenshot set (if multiple screenshots are supplied).

## 3. Typography and sizes

Is there one clear page title (Juno `ContentHeading`) and a consistent heading hierarchy below it? Are body and label text sizes appropriate? Flag anything oversized, undersized, or mismatched relative to Juno's type scale. Titles/headings must be Title Case (per `sap_juno_appkit` UX writing rules), not sentence case.

## 4. General layout

Is the page structured logically? Expected order on a content page: Breadcrumb → Page Heading → Toolbar → Main Content (per `sap_juno_appkit`). Check spacing, grouping, and visual hierarchy. Flag layout breaks, misaligned sections, or inconsistent padding.

## 5. Primary action — one per page

Identify every prominent/filled action button. There must be exactly one `primary` (or `primary-danger` on a destructive surface) per page — this is a Juno hard rule. Flag if zero or more than one. In a modal, the confirm button is the one primary and Cancel is `default`/`subdued`, so a confirm+cancel pair is still one primary.

## 6. Nomenclature — consistency across the page

Check every label, title, button, column header, and status text on this page. Flag:

- Inconsistent terms for the same concept (e.g. "Delete" in one place, "Remove" in another)
- Vague or ambiguous labels
- Casing inconsistencies (title case vs sentence case mixed)
  If multiple screenshots are in context, check cross-page consistency too.

## 7. Overflow menus

Find every overflow / context / kebab (⋮) menu visible in the screenshot. For each one check:

- Nomenclature: are action labels clear and consistent with item 6?
- Order: destructive actions (Delete, Remove) must be last; primary/common actions first.
  Flag any menu that violates either rule.

## 8. DataGridToolbar

If a DataGrid is present, check that a DataGridToolbar is rendered above it. Verify it contains:

- Search / filter input (if the grid is filterable)
- Bulk action controls (if rows are selectable)
- Add / Create action (if applicable for this page type)
  Flag if the toolbar is missing entirely or if expected controls are absent.

## 9. Tables — data, overflow, responsiveness

For every table or DataGrid visible:

- Is real or representative data shown (not placeholder "Lorem" or all-empty cells)?
- Are any cells truncating or overflowing their column width?
- Does the table handle narrow viewports (horizontal scroll or responsive columns)? Flag if columns are clearly clipped at the visible width.

## 10. Detail page — hover and click navigation

If this is a list page and a detail page exists for the listed entities:

- Is a hover state visible on rows (cursor change, row highlight)?
- Does clicking a row navigate to the detail page (check for `onClick` affordance or navigation cue in the screenshot)?
  Flag if rows appear static with no hover or click affordance.

## 11. Element positioning

Check the overall placement and alignment of elements:

- Are CTAs positioned consistently (e.g. top-right for page-level actions)?
- Are status badges, icons, and labels aligned to their content?
- Is there any element visually out of place or overlapping unexpectedly?

## 12. Juno components

From visual inspection, are Juno design system components in use? Check for:

- Standard Juno button styles (not custom styled buttons)
- Juno form inputs, selects, and modals
- Juno DataGrid / DataGridToolbar (not a plain HTML table)
- Juno navigation, breadcrumb, and page-layout shells
  Flag any element that looks hand-rolled or deviates from the Juno visual language.
  Note: visual inspection is approximate — when source code is available, use verifyUI for a precise check.

---

## Output format

```
## reviewVisual: <page type> – <page name or route if identifiable>

1. Page type        ✅ List page – Networks
2. Breadcrumb       ❌ Missing breadcrumb – no parent context shown
3. Typography       ✅
4. Layout           ⚠️ Uneven spacing between filter bar and table
5. Primary action   ✅ One primary action: "Create Network"
6. Nomenclature     ❌ "Remove" in overflow but "Delete" in confirmation dialog
7. Overflow menus   ✅ Destructive action last, labels clear
8. DataGridToolbar  ✅ Search + Create present
9. Tables           ⚠️ "Description" column truncating at 1280px viewport
10. Detail nav      ✅ Row hover state visible, click navigates to detail
11. Positioning     ✅
12. Juno components ⚠️ Pagination appears custom – verify against Juno Pagination component
```

List findings (❌ and ⚠️) again at the bottom, worst first, with a suggested fix per finding. If nothing is found, write `✅ No findings`.
