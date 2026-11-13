# Spec: Implement CLI Setup Modal with AWS CLI, s3cmd, rclone

**Ticket:** T-01 · **Epic:** [ceph-cli-setup-help-epic.md](../../epics/ceph-cli-setup-help-epic.md) · **Status:** ready-for-engineering
**Blocked by:** None

---

## User story

As a **project member working with S3 object storage**,
I want to **get ready-to-use CLI configuration with my project's endpoint and region pre-filled**,
so that **I can start using command-line tools (AWS CLI, s3cmd, rclone) without searching documentation or manually assembling connection details**.

---

## Acceptance criteria

- [ ] "CLI Setup" menu item appears in More Actions menu on bucket list page
- [ ] "CLI Setup" menu item appears in actions menu on individual bucket page
- [ ] Modal displays dynamically populated endpoint and region from `storage.ceph.containers.status`
- [ ] User can select between AWS CLI, s3cmd, and rclone via dropdown (AWS CLI default)
- [ ] Each CLI tool shows step-by-step instructions with copyable code blocks
- [ ] Commands use placeholders for credentials (`<ACCESS_KEY_ID>`, `<SECRET_ACCESS_KEY>`)
- [ ] When opened from bucket page, bucket name is pre-filled in example commands
- [ ] "Manage Credentials" button opens existing ManageCredentialsModal
- [ ] Loading state shows spinner with "Loading Connection Details..." (timeout: 10s → error state)
- [ ] Error state shows error message without rendering code blocks
- [ ] Modal closes via Close button, Escape key, or clicking outside
- [ ] Analytics events track all interactions
- [ ] Copy feedback via Juno CodeBlock built-in "Copied!" toast

---

## Happy path

1. User navigates to Ceph Object Storage section (bucket list page or individual bucket page).
2. User clicks "More Actions" menu (bucket list) or actions menu (bucket page).
3. User clicks "CLI Setup" menu item.
4. Modal opens, shows loading spinner with "Loading Connection Details...".
5. API returns endpoint and region; modal renders tool selector (AWS CLI selected by default).
6. User sees step-by-step instructions with pre-filled endpoint/region and credential placeholders.
7. User optionally switches tool via dropdown (s3cmd, rclone).
8. User copies commands via CodeBlock copy button; sees "Copied!" toast.
9. User optionally clicks "Manage Credentials" to open ManageCredentialsModal.
10. User closes modal via Close button, Escape key, or clicking outside.

---

## UI structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Modal (size="large")                                            │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Modal.Header                                                │ │
│ │ title="CLI Setup Guide"                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Modal.Content (overflow-y: auto)                            │ │
│ │                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Stack (gap="4")                                         │ │ │
│ │ │                                                         │ │ │
│ │ │ ┌─────────────────────────────────────────────────────┐ │ │ │
│ │ │ │ Select (label="CLI Tool")                           │ │ │ │
│ │ │ │ ├── AWS CLI (default)                               │ │ │ │
│ │ │ │ ├── s3cmd                                           │ │ │ │
│ │ │ │ └── rclone                                          │ │ │ │
│ │ │ └─────────────────────────────────────────────────────┘ │ │ │
│ │ │                                                         │ │ │
│ │ │ ┌─────────────────────────────────────────────────────┐ │ │ │
│ │ │ │ CliToolInstructions                                 │ │ │ │
│ │ │ │ ├── Prerequisites (bullet list)                     │ │ │ │
│ │ │ │ ├── Step 1: heading + CodeBlock                     │ │ │ │
│ │ │ │ ├── Step 2: heading + CodeBlock                     │ │ │ │
│ │ │ │ └── Step N: heading + CodeBlock                     │ │ │ │
│ │ │ └─────────────────────────────────────────────────────┘ │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Modal.Footer                                                │ │
│ │ ┌───────────────────┐              ┌─────────────────────┐  │ │
│ │ │ Manage Credentials│              │       Close         │  │ │
│ │ │ (variant="subdued")              │ (variant="primary") │  │ │
│ │ └───────────────────┘              └─────────────────────┘  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

| Element            | Component             | Notes                                            |
| ------------------ | --------------------- | ------------------------------------------------ |
| Modal container    | Juno `Modal`          | `size="large"` for CodeBlock readability         |
| Tool selector      | Juno `Select`         | AWS CLI / s3cmd / rclone; AWS CLI default        |
| Instructions       | `CliToolInstructions` | Custom component, Stack gap="4"                  |
| Code blocks        | Juno `CodeBlock`      | `copyToClipboard` prop, built-in "Copied!" toast |
| Loading state      | Juno `Spinner`        | "Loading Connection Details..." text             |
| Error state        | Juno `Message`        | `variant="warning"`, in Modal.Content            |
| Manage Credentials | Juno `Button`         | `variant="subdued"`, footer left                 |
| Close button       | Juno `Button`         | `variant="primary"`, footer right                |

### Instructions structure (per tool)

Each tool renders via `CliToolInstructions` component:

```tsx
<Stack gap="4">
  {/* Prerequisites */}
  <Box>
    <Text variant="heading-sm">Prerequisites</Text>
    <ul>
      <li>Install AWS CLI v2</li>
      <li>Have S3 credentials ready</li>
    </ul>
  </Box>

  {/* Steps */}
  <Box>
    <Text variant="heading-sm">1. Configure credentials</Text>
    <CodeBlock code="aws configure" copyToClipboard />
  </Box>

  <Box>
    <Text variant="heading-sm">2. Set endpoint</Text>
    <CodeBlock code={`aws configure set ...`} copyToClipboard />
  </Box>

  {/* ... more steps */}
</Stack>
```

Snippet data via `getCliSnippets(tool, { endpoint, region })` returning `{ prerequisites: string[], steps: CliStep[] }`.

---

## State model

| State   | What triggers entry           | What the user sees                            |
| ------- | ----------------------------- | --------------------------------------------- |
| Loading | Modal opens; API call starts  | Spinner with "Loading Connection Details..."  |
| Error   | API error or 10s timeout      | Message component with error; no code blocks  |
| Success | API returns endpoint + region | Tool selector + instructions with code blocks |

**Transitions:**

- → Loading: User clicks "CLI Setup" menu item
- Loading → Success: API returns `{ endpoint, region }` within 10s
- Loading → Error: API error or timeout (10s)
- Error → Loading: User clicks Retry button (network/500 errors only)

---

## API contracts

### Get Ceph connection details

**Endpoint:** `tRPC storage.ceph.containers.status`
**Auth:** Keystone token via project-scoped session (existing auth)

**Request:**

```typescript
{
  project_id: string
}
```

**Response (200):**

```json
{
  "hasCredentials": true,
  "endpoint": "https://rgw.st1.eu-de-2.cloud.sap",
  "region": "eu-de-2"
}
```

**Query options:**

```typescript
{
  enabled: isOpen && !!projectId,
  retry: false,
  staleTime: Infinity  // endpoint/region are deployment constants
}
```

Shares cache with ManageCredentialsModal — no duplicate fetches.

**Error responses:**

| Status  | Meaning           | UI treatment                                      |
| ------- | ----------------- | ------------------------------------------------- |
| 401     | Unauthenticated   | Global redirect to login (handled by `_auth.tsx`) |
| 403     | Forbidden         | Inline "Access Denied" message, no Retry          |
| Network | Connection failed | Inline "Connection Error" + Retry button          |
| 500     | Server error      | Inline "Connection Error" + Retry button          |

---

## Error handling

| Failure mode        | What the user sees                                           | Recovery action |
| ------------------- | ------------------------------------------------------------ | --------------- |
| 401 Unauthenticated | Auto-redirect to login                                       | Re-authenticate |
| 403 Forbidden       | "Access Denied. Contact your project administrator."         | Close modal     |
| Network timeout     | "Connection Error. Please check your network and try again." | Retry button    |
| 500 Server error    | "Connection Error. Please check your network and try again." | Retry button    |

**Error UI pattern:**

```tsx
<Modal.Content>
  <Message variant="warning">
    <Message.Title>{is403 ? "Access Denied" : "Connection Error"}</Message.Title>
    <Message.Body>{errorMessage}</Message.Body>
  </Message>
</Modal.Content>
<Modal.Footer>
  {!is403 && <Button variant="subdued" onClick={refetch} loading={isRefetching}>Retry</Button>}
  <Button variant="primary" onClick={onClose}>Close</Button>
</Modal.Footer>
```

---

## Auth & permission gates

| Role          | Can see CLI Setup | Can view instructions | Can create credentials                  |
| ------------- | ----------------- | --------------------- | --------------------------------------- |
| admin         | ✅ Yes            | ✅ Yes                | ✅ Yes                                  |
| member        | ✅ Yes            | ✅ Yes                | ✅ Yes                                  |
| reader/viewer | ✅ Yes            | ✅ Yes                | ❌ No (error in ManageCredentialsModal) |

CLI Setup is read-only information visible to all roles with access to Ceph Storage. No role gating on the feature itself. Users without credential-creation permission will see the instructions but encounter an error if they try to create keys in ManageCredentialsModal.

---

## Edge cases

| Edge case            | Handling                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| Long endpoint URL    | CodeBlock handles natively (overflow/wrap)                                                         |
| Null/empty region    | Fallback to `"your-region"` placeholder in snippets                                                |
| Cached vs fresh data | `staleTime: Infinity` — endpoint/region don't change during session                                |
| Modal stacking       | Mutual exclusion via parent state — "Manage Credentials" closes CLI Setup, opens Credentials modal |

**Modal mutual exclusion pattern:**

```tsx
// Parent component
const [activeModal, setActiveModal] = useState<"none" | "cliSetup" | "credentials">("none")

<CliSetupModal
  isOpen={activeModal === "cliSetup"}
  onClose={() => setActiveModal("none")}
  onOpenCredentials={() => setActiveModal("credentials")}
/>

<ManageCredentialsModal
  isOpen={activeModal === "credentials"}
  onClose={() => setActiveModal("none")}
/>
```

---

## Performance

- **Caching:** `staleTime: Infinity` — endpoint/region are deployment constants
- **Shared cache:** Same query used by ManageCredentialsModal; no duplicate fetches
- **Payload size:** ~100 bytes response
- **No pagination:** Single API call, small response
- **No specific budget:** Modal content is lightweight text + code blocks

---

## Accessibility

No custom accessibility code required — Juno components provide WCAG 2.1 AA compliance:

| Requirement            | Handled by                   |
| ---------------------- | ---------------------------- |
| Focus trap in modal    | Juno Modal                   |
| Focus restore on close | Juno Modal                   |
| Escape key closes      | Juno Modal                   |
| Copy announcements     | Juno CodeBlock (`aria-live`) |
| Semantic headings      | `Text variant="heading-sm"`  |
| Label associations     | Juno Select `label` prop     |

---

## Analytics

| Event                 | Trigger                       | Payload                                      |
| --------------------- | ----------------------------- | -------------------------------------------- |
| `cliSetup.open`       | Modal opens                   | `{}`                                         |
| `cliSetup.close`      | Modal closes                  | `{}`                                         |
| `cliSetup.selectTool` | User selects a different tool | `{ tool: 'aws-cli' \| 's3cmd' \| 'rclone' }` |

---

## Files to create/modify

| File                       | Action | Purpose                                         |
| -------------------------- | ------ | ----------------------------------------------- |
| `CliSetupModal.tsx`        | Create | Modal shell, state management, error handling   |
| `CliToolInstructions.tsx`  | Create | Renders prerequisites + steps for selected tool |
| `cliSetupSnippets.ts`      | Create | CLI configuration templates for all 3 tools     |
| `cliSetupSnippets.test.ts` | Create | Unit tests for snippet generation               |
| `CliSetupModal.test.tsx`   | Create | Component tests                                 |
| Bucket list page           | Modify | Add "CLI Setup" to More Actions menu            |
| Bucket detail page         | Modify | Add "CLI Setup" to actions menu                 |

---

## Open items

None — all questions answered.
