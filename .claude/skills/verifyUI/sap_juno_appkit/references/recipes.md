# Juno App Recipes

Copy-paste skeletons. All imports from `@cloudoperators/juno-ui-components`. Every class is `jn:`-prefixed and theme-aware. Prop details: read the component source `tmp/juno/packages/ui-components/src/components/{Name}/` or dispatch `sap_juno_lookup`. **All visible labels/titles use Title Case** (`docs/ux/ux-writing-content-design.md`).

## 1. Standard app page

```tsx
import {
  AppShellProvider,
  AppShell,
  PageHeader,
  ThemeToggle,
  Container,
  ContentHeading,
} from "@cloudoperators/juno-ui-components"

export const App = () => (
  <AppShellProvider theme="theme-dark">
    <AppShell
      pageHeader={
        <PageHeader applicationName="My App" logo>
          <ThemeToggle />
        </PageHeader>
      }
    >
      <Container py>
        <ContentHeading>Dashboard</ContentHeading>
        {/* page body */}
      </Container>
    </AppShell>
  </AppShellProvider>
)
```

## 2. With side navigation

```tsx
<AppShell
  pageHeader="My App"
  sideNavigation={
    <SideNavigation>
      <SideNavigationItem icon="home" label="Overview" selected />
      <SideNavigationItem icon="place" label="Resources" />
      <SideNavigationGroup label="Settings" open>
        <SideNavigationItem label="Profile" />
        <SideNavigationItem label="Access" />
      </SideNavigationGroup>
    </SideNavigation>
  }
>
  <Container py>
    <ContentHeading>Overview</ContentHeading>
  </Container>
</AppShell>
```

Top navigation is the same idea via the `topNavigation` slot with `<TopNavigation><TopNavigationItem/></TopNavigation>`.

## 3. Form page

```tsx
<Container py>
  <ContentHeading>Create Resource</ContentHeading>
  <Form title="New Resource">
    <FormSection title="General">
      <FormRow>
        <TextInput label="Name" required value={name} onChange={onName} invalid={!!nameError} errortext={nameError} />
      </FormRow>
      <FormRow>
        <Select label="Region" value={region} onChange={onRegion}>
          <SelectOption value="eu" label="EU" />
          <SelectOption value="us" label="US" />
        </Select>
      </FormRow>
      <FormRow>
        <Switch label="Enable Monitoring" on={monitoring} onChange={onMonitoring} />
      </FormRow>
    </FormSection>
    <ButtonRow>
      <Button variant="primary" label="Create" onClick={submit} />
      <Button variant="subdued" label="Cancel" onClick={cancel} />
    </ButtonRow>
  </Form>
</Container>
```

Validation on any input: `invalid` + `errortext`, `valid` + `successtext`, `helptext`.

## 4. Data list page

```tsx
<Container py>
  <ContentHeading>Resources</ContentHeading>

  <ContentAreaToolbar>
    <Button variant="primary" icon="addCircle" label="New Resource" onClick={openPanel} />
  </ContentAreaToolbar>

  <DataGrid columns={4}>
    <DataGridRow>
      <DataGridHeadCell>Name</DataGridHeadCell>
      <DataGridHeadCell>Region</DataGridHeadCell>
      <DataGridHeadCell>Status</DataGridHeadCell>
      <DataGridHeadCell>Actions</DataGridHeadCell>
    </DataGridRow>
    {items.map((it) => (
      <DataGridRow key={it.id} onClick={() => select(it)}>
        <DataGridCell>{it.name}</DataGridCell>
        <DataGridCell>{it.region}</DataGridCell>
        <DataGridCell>
          <Badge variant="success" text={it.status} />
        </DataGridCell>
        <DataGridCell>
          <Icon icon="edit" onClick={() => edit(it)} />
        </DataGridCell>
      </DataGridRow>
    ))}
  </DataGrid>

  <Pagination variant="number" currentPage={page} totalPages={total} onPressNext={next} onPressPrevious={prev} />
</Container>
```

For fixed-width columns use `gridColumnTemplate` instead of `columns`, e.g. `gridColumnTemplate="1fr 1fr auto 120px"`.

A `DataGridRow` with `onClick` is natively clickable and ships its own hover affordance — do **not** also colour a cell's text as a link (`text-theme-link`) to fake one.

## 5. Panel drawer ("new item" flow)

```tsx
<Panel heading="New Resource" opened={open} onClose={close} size="large">
  <PanelBody
    footer={
      <PanelFooter>
        <Button variant="primary" label="Save" onClick={save} />
        <Button variant="subdued" label="Cancel" onClick={close} />
      </PanelFooter>
    }
  >
    <Form>
      <FormRow>
        <TextInput label="Name" required />
      </FormRow>
    </Form>
  </PanelBody>
</Panel>
```

## 6. Confirm / destructive Modal

```tsx
<Modal
  open={open}
  title="Delete Resource"
  size="small"
  confirmButtonLabel="Delete"
  confirmButtonVariant="primary-danger"
  disableConfirmButton={typed !== resourceName} // high-risk: re-type to enable
  onConfirm={del}
  onCancel={close}
>
  <p className="jn:text-theme-default">
    Type <strong>{resourceName}</strong> to confirm deletion.
  </p>
  <TextInput value={typed} onChange={(e) => setTyped(e.target.value)} />
</Modal>
```

Lower risk: drop the `disableConfirmButton` gate (low) or gate on a Checkbox (medium).

## 7. Empty / loading / error state

```tsx
<Status
  status="empty"
  title="No Resources Yet"
  body="Create your first resource to get started."
  action={<Button variant="primary" label="New Resource" onClick={create} />}
/>
```

`status`: `progress` (set `spinner`), `error` (set `code`/`details`), `empty`, `no-matches`. The state component is returned **instead of** the DataGrid — never as a row nested below the header.

## 8. Detail view — attributes of one record

```tsx
<DescriptionList>
  <DescriptionTerm>Name</DescriptionTerm>
  <DescriptionDefinition>{resource.name || "- -"}</DescriptionDefinition>
  <DescriptionTerm>Status</DescriptionTerm>
  <DescriptionDefinition>{resource.status}</DescriptionDefinition>
</DescriptionList>
```

Key/value attributes of a single entity use `DescriptionList` — **not** a two-column `DataGrid` with a bold label cell. `DataGrid` is only for genuinely tabular, multi-row data. Empty value placeholder is `- -` (house rule).

---

**Styling note:** reach for Juno components and their props first; add raw `jn:` utilities only for gaps between them (`jn:mt-4`, `jn:text-theme-light`). Never introduce non-Juno colors — only `theme-*` tokens exist. See foundations.md.
