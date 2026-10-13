---
name: juno-review-identify-components
description: "Step 3B of the Juno review chain. Identifies every Juno component visible in the screenshots and runs juno-lookup for any that have not been looked up this session. Contains the full visual identification reference for all ~105 Juno components organised by category. Triggered automatically after juno-review-read-inputs."
version: 1.0.0
---

# juno-review-identify-components — Identify Components (Step 3B)

Second step of the Juno screenshot review chain. Map every visible UI element to its Juno component, then run `juno-lookup` for any not yet looked up this session.

**Position in chain:** `juno-sync` → `juno-lookup` → `juno-review-read-inputs` → **`juno-review-identify-components`** → `juno-review-build-findings` → `juno-review-write-report` → `juno-review-confirm-output`

---

## Rule

For every component identified here, check whether `juno-lookup` has already run for it this session. If not, run it now before proceeding to `juno-review-build-findings`.

---

## Full visual identification reference

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

These components provide layout, context, or theming and are not directly visible. Do not attempt to identify them from a screenshot.

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

## Output of this step

An internal record (held in working context) listing every component identified, and confirming whether `juno-lookup` was run for each:

```
COMPONENTS IDENTIFIED
---------------------
  [ComponentName] — juno-lookup: already run | run now
  [ComponentName] — juno-lookup: already run | run now
  ...
```

Output this summary before proceeding to `juno-review-build-findings`.
