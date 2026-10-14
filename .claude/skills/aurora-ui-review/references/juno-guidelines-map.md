# Juno UX guidelines map

Source: https://github.com/cloudoperators/juno/tree/main/docs/ux
Raw files (for fetching): `https://raw.githubusercontent.com/cloudoperators/juno/main/docs/ux/<file>.md`
Component docs (Storybook): `https://cloudoperators.github.io/juno/?path=/docs/components-<name>--docs`

**Use only the docs that apply** to what the reviewed UI contains. For each applicable doc, fetch it, read the listed sections, and cite `<file>#<section>` in findings. The "Key rules" column lists rules verified when this skill was written. They are a starting point, not a substitute for reading the doc; the docs evolve.

## Select by what is in scope

| The UI contains                       | Read                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A list page with a table              | `datagrid.md`, `page-content-area.md`, `page-level-actions.md`, `error-handling-loading-empty-states.md`                                    |
| A details page                        | `page-content-area.md`, `page-header.md`, `page-level-actions.md`, `error-handling-loading-empty-states.md`                                 |
| Tabs on a page                        | `page-level-actions.md#pages-with-tabs`                                                                                                     |
| Row menus or overflow menus           | `popup-and-overflow-menus.md`                                                                                                               |
| Create / edit / delete (full mode)    | `modals.md`, `forms.md`, `interaction-guidelines.md`, `messages-and-notifications.md`, `transient-states-and-progress.md`                   |
| Permission-dependent elements         | `ui-for-unauthorized-users.md`, `page-level-actions.md#disabled-vs-hidden-actions`, `datagrid.md#render-elements-based-on-user-permissions` |
| Inline add / edit / delete in a table | `inline-adding-editing-and-deleting.md`                                                                                                     |
| Messages, toasts, banners             | `messages-and-notifications.md`, `semantic-variants.md`                                                                                     |
| A side navigation entry               | `navigation-side-navigation.md#item-labels-and-icons`                                                                                       |
| Highlighted info blocks               | `box.md`                                                                                                                                    |
| Any user-facing text                  | `ux-writing-content-design.md`                                                                                                              |
| Any interactive element               | `accessibility.md`, `interaction-guidelines.md`                                                                                             |

**Usually not relevant** for resource pages (skip unless the change touches them): `sign-in.md`, `authentication-and-access.md`, `the-appshell.md`, `juno-layout.md`, `embedded-application-layout.md`, `legacy-application-layout.md`, `wizard.md`, `navigation-fundamentals.md`, `versioning-and-deprecation-policy.md`, `introduction.md`, `foundations.md`, `core-concepts.md`, `glossary.md`.

## Per document

### `datagrid.md`

**Sections:** When to Use a DataGrid · DataGrid Header / Toolbar (Zone 1 / 2 / 3) · Filter and Sort Persistence on Navigation · Column Order, Structure, and Layout · Clickable Items / Rows · Selecting Rows / Items · Empty, Loading, and Error States · Re-Loading Data · Render Elements Based on User Permissions · Content and Writing

**Key rules:**

- **States.** Loading, empty, filtered-empty and error states each use `Status`, placed inside a `DataGridRow` / `DataGridCell` spanning all columns.
  - The loading indicator is scoped to the grid, not the whole page.
  - "No data exists" and "no data matches your filters" must be **distinguished**. `Status` has `"empty"` and `"no-matches"` variants.
  - The error state explains the error and offers a retry where possible.
- **Clickable rows.** If clicking a row navigates (e.g. to details), the **entire row** is clickable, with hover feedback. Nested interactive elements (buttons, links, menus) call `event.stopPropagation()`.
- **Permission-dependent elements:**
  - No "Create […]" button when the user can't create.
  - No bulk-action elements or selection checkboxes when the user can't perform any bulk action.
- **Toolbar zones.** Zone 1: predefined filters (tabs), sorting, actions. Zone 2: filters and search. Zone 3: view state, bulk actions, refresh. Check the zone placement of every toolbar element.
- **Persistence.** Read the "Filter and Sort Persistence on Navigation" section and check the list's search, sort and filter behaviour against it.

### `page-level-actions.md`

**Sections:** Guiding Principle · Toolbar Slots · The Primary Action · Secondary Actions · The Overflow Menu (composition, order, grouping, destructive) · The Refresh Button · Icon-Only Buttons · Disabled vs. Hidden Actions · Page Structure Specifics (List and Detail Pages · Pages with DataGrids · Pages with Tabs)

**Key rules:**

- **Refresh button.** Always directly visible, never in an overflow menu, in the leftmost toolbar slot. Its label and tooltip are **"Refresh Page"**. It is disabled with visual feedback while refreshing. A page that consists only of a DataGrid uses the grid's refresh, not a page-level one.
- **Disabled vs. hidden.** **Disable** an action when it's generally available but temporarily blocked. **Consider not rendering** it when the user lacks permission or it won't be available soon. A disabled button doesn't need a tooltip.
- **Tabs.** Actions affecting the whole page go **above** the tab bar; tab-scoped actions go **below** it. Page-level toolbar actions are static: they don't change with the active tab.

### `error-handling-loading-empty-states.md`

**Sections:** "BIG" Errors (server, app, routing) · Authentication/Authorization Errors: Unauthenticated (401), Page-level Unauthorized (403), Authorized content / unauthorized action · Component/Rendering/API Errors · Operation/Action/CRUD Errors · Validation Errors · (loading and empty states)

**Check:** each error class in the UI is handled the way its section prescribes. Typical cases: a 403 on a list call, a failed details fetch, a failed sub-resource fetch inside a details tab, a failed mutation.

### `page-content-area.md`

**Sections:** Side Navigation · General Page Content Structure · Types of Pages (List Pages · Detail Pages)

**Check:** list and details pages follow the described structure.

### `page-header.md`

**Sections:** What Goes in the Header

**Check:** header content (title, actions) on list and details pages.

### `popup-and-overflow-menus.md`

**Sections:** Overflow Menu (when to use) · Menu Item Order and Grouping (item order · grouping · destructive actions)

**Check:** row and overflow menu item order, grouping, and the placement and labelling of destructive items.

### `modals.md` (full mode)

**Sections:** When to Use / Not Use · Anatomy · Actions, Behaviour, and Interaction (no modals without previous interaction · one primary action · redundant cancel/close · confirmations · destructive actions) · Content and Title · Messages in Modals · Accessibility · Form Validation Specifics in Modals

### `forms.md` (full mode)

**Sections:** Field Ordering · Required vs. Optional · Layout · Labels and IDs · Grouped Inputs · Input Types · Communicating Expectations · Validation (when; inline vs. summary; cross-field) · Conditional and Dependent Fields · Submit and Cancel (placement and order)

### `interaction-guidelines.md`

**Sections:** Clarity and Predictability · Feedback · Confirmation of Consequential Actions · Reversibility · Efficiency · Consistency · Disabled States · Keyboard and Focus

### `messages-and-notifications.md`

**Sections:** Messages (title, content, placement, dismissible) · Notifications (Toast and NotificationManager, auto-dismiss, dismissible, multiple)

### `semantic-variants.md`

**Sections:** `error` vs. `danger` · `warning` vs. `error` · Use Variants as Intended

**Check:** `Message`, `Button` and `Modal` variants are used for their intended meaning.

### `transient-states-and-progress.md`

**Sections:** Busy UI Elements · Busy Entities · Spinner (when) · Progress Bar (definite / indefinite)

**Check:** busy buttons (e.g. `Button progress`), busy rows or entities, and spinner vs. progress bar choice.

### `ui-for-unauthorized-users.md`

**Sections:** 1. Render Disabled Elements · 2. Don't Render Specific Elements at All · 3. Render Fully Functional Elements, Show Error

**Check:** every permission-gated element follows one of the three strategies, and the choice fits the doc's guidance and the epic.

### `ux-writing-content-design.md`

**Sections:** Scope, Audience and Tone · Active or Passive Voice · Avoid Substantiations · Take Professional Users Seriously · Be Precise, Use Just Enough Jargon · "You" vs. "Me" · Title Case · Be Ready for Internationalization · Consistency

**Key rules:**

- **Title Case** for titles and headings in text, modals, panels, DataGrid (column headers), lists, buttons, and message and notification titles.
- **Capitalize:** first and last word, nouns, verbs, pronouns, adjectives, adverbs, numbers, and subordinating conjunctions.
- **Lowercase** (unless first or last): articles, short prepositions (≤ 5 letters), short coordinating conjunctions, and "to" in infinitives.

### `accessibility.md`

**Sections:** Semantic HTML · Labels and Accessible Names · Descriptive and Help Text · Keyboard Navigation and Focus · Colour and Contrast · Dynamic Content

**Check:**

- Icon-only buttons have accessible names (`aria-label` or `title`).
- Modals have a title or `ariaLabel`.
- Interactive rows and menus are keyboard reachable.
- Status changes are announced.

### `navigation-side-navigation.md`

**Sections:** Anatomy · Structure and Depth · Item Labels and Icons · Active and Disabled States · Accessibility

**Check:** the new navigation entry's label, its position in its group, and its active state.

### `inline-adding-editing-and-deleting.md`

**Sections:** When to Use · Inline Editing · Inline Adding · Inline Deleting

Only if the UI edits items inline in a table.

### `box.md`

**Sections:** When to Use · Semantic Variants · Title · Inline Action Box

Only if the UI uses `Box` or `IntroBox`.
