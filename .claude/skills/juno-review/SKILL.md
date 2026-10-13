---
name: juno-review
description: "Juno UI screenshot review skill. Produces a structured developer-ready markdown review of Aurora/Juno UI screenshots. Reads annotation boxes and chat notes, maps each finding to a Juno component, and writes a numbered tagged report to a markdown file. Always runs after juno-sync and juno-lookup. Triggers: 'review UI screenshots', 'review this screen', 'check this screenshot', 'give feedback on this design', 'annotate this screenshot', 'review Aurora UI'."
version: 1.0.0
---

# juno-review — Juno UI Screenshot Review

Produces a structured developer-ready markdown review of Aurora/Juno UI screenshots. Always run after `juno-sync` and `juno-lookup` — for every component visible in the screenshots, `juno-lookup` must have run first.

---

## How to use this skill

1. Confirm that `juno-sync` and `juno-lookup` have already run this session.
2. Read all inputs (Step 3A).
3. Identify every component visible in the screenshots and verify props via `juno-lookup` (Step 3B).
4. Build the finding list (Step 3C).
5. Write the output file (Step 3D).
6. Confirm the file path to the user (Step 3E).

---

## Step 3A — Read all inputs

Read both sources before writing a single finding:

**Source 1 — annotation boxes visible in the screenshot:**

- Red box labelled **Changes** = confirmed change request.
- Teal box labelled **Question** = open question, decision still needed.
- Record: box colour/label, exact text content, date shown in the annotation (if any).

**Source 2 — notes typed in the chat by the user.**

Apply the same rules to both sources. Do not paraphrase annotation text — use the exact wording.

---

## Step 3B — Identify components

For every UI element visible in the screenshots, identify the Juno component and run `juno-lookup` if it has not already been run for that component this session.

### Buttons and actions

| What you see                            | Component                                      |
| --------------------------------------- | ---------------------------------------------- |
| Primary action button (teal/filled)     | `<Button variant="primary">`                   |
| Destructive action button (red/filled)  | `<Button variant="primary-danger">`            |
| Default bordered button                 | `<Button variant="default">`                   |
| Muted / low-emphasis button             | `<Button variant="subdued">`                   |
| Button showing a spinner                | `<Button progress={true} progressLabel="...">` |
| Horizontal row of buttons               | `<ButtonRow>`                                  |
| Column sort button with arrow indicator | `<SortButton>`                                 |
| Button toggling between two states      | `<ToggleButton>`                               |
| Dark / light mode toggle button         | `<ThemeToggle>`                                |

### Forms and inputs

| What you see                                | Component                   |
| ------------------------------------------- | --------------------------- |
| Single-line text input field                | `<TextInput>`               |
| Multi-line text input                       | `<Textarea>`                |
| Searchable dropdown with text entry         | `<ComboBox>`                |
| Option within a ComboBox                    | `<ComboBoxOption>`          |
| Styled select dropdown                      | `<Select>`                  |
| Option within a Select                      | `<SelectOption>`            |
| Divider line within a Select list           | `<SelectDivider>`           |
| Native HTML select                          | `<NativeSelect>`            |
| Option within a NativeSelect                | `<NativeSelectOption>`      |
| Option group within a NativeSelect          | `<NativeSelectOptionGroup>` |
| Date/time field with calendar picker        | `<DateTimePicker>`          |
| Tick box                                    | `<Checkbox>`                |
| Labelled group of checkboxes                | `<CheckboxGroup>`           |
| Radio button                                | `<Radio>`                   |
| Labelled group of radio buttons             | `<RadioGroup>`              |
| On/off toggle switch                        | `<Switch>`                  |
| Text field with magnifier icon              | `<SearchInput>`             |
| Masked/password field with show/hide toggle | `<SecretText>`              |
| Inline group of inputs displayed together   | `<InputGroup>`              |
| Form field label                            | `<Label>`                   |
| Hint text below a form field                | `<FormHint>`                |
| Horizontal row within a form                | `<FormRow>`                 |
| Labelled section within a form              | `<FormSection>`             |
| Form wrapper                                | `<Form>`                    |

### Data display

| What you see                                             | Component                                                   |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| Tabular data with rows and columns                       | `<DataGrid>`                                                |
| Single data row in a table                               | `<DataGridRow>`                                             |
| Individual data cell                                     | `<DataGridCell>`                                            |
| Sortable column header cell                              | `<DataGridHeadCell>`                                        |
| Table footer row area                                    | `<DataGridFoot>`                                            |
| Toolbar above a DataGrid (search, filters, bulk actions) | `<DataGridToolbar>`                                         |
| Key-value pairs layout                                   | `<DescriptionList>`                                         |
| Key/label part of a key-value pair                       | `<DescriptionTerm>`                                         |
| Value part of a key-value pair                           | `<DescriptionDefinition>`                                   |
| Small colored pill label / tag                           | `<Badge>`                                                   |
| Small colored tag or chip                                | `<Pill>`                                                    |
| Small colored status dot or badge                        | `<Status>`                                                  |
| Colored alert box (info/warning/error/success/danger)    | `<Message variant="info\|warning\|error\|success\|danger">` |
| Introductory info or callout box                         | `<IntroBox>`                                                |
| Inline code span                                         | `<Code>`                                                    |
| Multi-line syntax-highlighted code block                 | `<CodeBlock>`                                               |
| Footer beneath a CodeBlock                               | `<CodeBlockFooter>`                                         |
| Interactive collapsible JSON tree                        | `<JsonViewer>`                                              |
| Rich text / HTML display area                            | `<FormattedText>`                                           |
| Section heading within content area                      | `<ContentHeading>`                                          |
| Horizontal rule / separator line                         | `<Divider>`                                                 |
| Horizontal progress bar                                  | `<ProgressBar>`                                             |
| White card with border and padding                       | `<Box>`                                                     |
| Card with shadow and border                              | `<Card>`                                                    |
| Toolbar in the content area                              | `<ContentAreaToolbar>`                                      |

### Navigation

| What you see                                                | Component               |
| ----------------------------------------------------------- | ----------------------- |
| Horizontal navigation trail (e.g. Home > Servers > Details) | `<Breadcrumb>`          |
| Individual segment in a breadcrumb trail                    | `<BreadcrumbItem>`      |
| Top horizontal navigation bar                               | `<TopNavigation>`       |
| Item in the top navigation bar                              | `<TopNavigationItem>`   |
| Left-side tree navigation                                   | `<SideNavigation>`      |
| Collapsible group in side nav                               | `<SideNavigationGroup>` |
| Single item in side nav                                     | `<SideNavigationItem>`  |
| List wrapper in side nav                                    | `<SideNavigationList>`  |
| Top page header bar with title and actions                  | `<PageHeader>`          |
| Bottom page footer bar                                      | `<PageFooter>`          |
| Numbered page controls (prev/next/page numbers)             | `<Pagination>`          |
| Navigation wrapper                                          | `<Navigation>`          |
| Single nav link                                             | `<NavigationItem>`      |

### Tabs

| What you see                                       | Component      |
| -------------------------------------------------- | -------------- |
| Tab bar at main page level                         | `<MainTabs>`   |
| Tab bar (introduced in v3, replaces TabNavigation) | `<TabBar>`     |
| Item within a TabBar                               | `<TabBarItem>` |
| Tabs container                                     | `<Tabs>`       |
| List of tab items                                  | `<TabList>`    |
| Single tab element                                 | `<Tab>`        |
| Content panel shown for the active tab             | `<TabPanel>`   |

### Overlays and feedback

| What you see                                    | Component                                   |
| ----------------------------------------------- | ------------------------------------------- |
| Centered dialog overlay                         | `<Modal title="..." size="...">`            |
| Wide modal                                      | `<Modal size="xl">` or `<Modal size="2xl">` |
| Button area at the bottom of a Modal            | `<ModalFooter>`                             |
| Side panel / drawer sliding in from edge        | `<Panel>`                                   |
| Body content of a Panel                         | `<PanelBody>`                               |
| Button area at the bottom of a Panel            | `<PanelFooter>`                             |
| Three-dot / kebab / overflow dropdown menu      | `<PopupMenu>`                               |
| Item within a PopupMenu                         | `<PopupMenu.Item label="...">`              |
| Hover tooltip bubble                            | `<Tooltip>`                                 |
| Content inside a Tooltip                        | `<TooltipContent>`                          |
| Element that triggers a Tooltip                 | `<TooltipTrigger>`                          |
| Small inline loading spinner                    | `<Spinner>`                                 |
| Full-area loading overlay with spinner          | `<LoadingIndicator>`                        |
| Transient notification popup (auto-dismisses)   | `<Toast>`                                   |
| Container managing multiple Toast notifications | `<NotificationManager>`                     |

### Icons and structural elements

| What you see                                 | Component      |
| -------------------------------------------- | -------------- |
| SVG icon                                     | `<Icon>`       |
| Login form with username/password and submit | `<SignInForm>` |
| Flex stack (vertical or horizontal layout)   | `<Stack>`      |
| CSS grid layout                              | `<Grid>`       |
| Grid row                                     | `<GridRow>`    |
| Grid column                                  | `<GridColumn>` |

### Invisible / structural (not visually identifiable in screenshots)

These components provide layout, context, or theming and are not directly visible:

| Component                | Role                          |
| ------------------------ | ----------------------------- |
| `<AppBody>`              | Outer body wrapper            |
| `<AppShell>`             | Application shell             |
| `<AppShellProvider>`     | Context provider              |
| `<Container>`            | Generic layout container      |
| `<ContentContainer>`     | Content area wrapper          |
| `<HeaderContainer>`      | Header area wrapper           |
| `<MainContainer>`        | Main content wrapper          |
| `<MainContainerInner>`   | Inner main wrapper            |
| `<PortalProvider>`       | DOM portal provider           |
| `<ShadowRoot>`           | Shadow DOM wrapper            |
| `<StyleProvider>`        | Theming/CSS provider          |
| `withDeprecationWarning` | HOC for deprecated components |

---

## Step 3C — Build the finding list

For each annotation box and each chat note:

1. A single annotation box may contain multiple issues — treat each as a **separate numbered item**.
2. Extract the **Location** breadcrumb from what is visible in the screenshot (top page breadcrumb and/or in-modal path).
3. Assign a **tag**: `Aurora`, `Juno`, `Design`, or `Bug`. When no tag is stated, default to `Aurora`.
4. Assign an **annotation type**: `Changes` or `Question`.
5. Identify the **Juno component** for the affected element (use Step 3B or `juno-lookup` results).
6. Check if a developer has enough context to act — flag anything missing with `⚠️ Needs:`:
   - Current state described?
   - Desired state described?
   - Triggering condition clear?
   - Component identified?
   - Exact copy included (if a text change)?

---

## Step 3D — Write the output file

Write the review to a markdown file using the Write tool.

**File naming:** `review-[Extract the **Location** breadcrumb from what is visible in the screenshot (top page breadcrumb and/or in-modal path).]-[YYYY-MM-DD].md`

- Use today's date.
- Use the main screen name from the screenshots (lowercase, hyphens, no spaces).
- Write to the current working directory.

**File structure:**

```markdown
### [App name] — [Screen or modal title as shown in the UI]

**Location:** `breadcrumb › path › as › visible › in › screenshot`
**Annotation:** [Changes | Question] · [Date from annotation, or omit if notes came from chat]

---

Rules for sections:

- Include only sections that have findings — omit empty sections.
- Numbering is continuous across all sections (1, 2, 3 ... not restarting per section).
- Only use the actuall flinding
- Dont envent rules
- Be brief and consise
- if in doubt, provide finding but clearly state that this is your suggestion

---

## Step 3E — Confirm file path

After writing, output one line to the user:

> `Review written to: [full file path]`
```
