# Spec: Implement CLI Setup Modal with AWS CLI, s3cmd, rclone

**Ticket:** T-01 · **Issue:** [#1208](https://github.com/cobaltcore-dev/aurora-dashboard/issues/1208) · **Status:** ready-for-engineering
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
- [ ] "CLI Setup" button appears next to "Manage Credentials" on the "S3 Object Storage: Setup Required" screen (no access keys yet)
- [ ] Modal displays dynamically populated endpoint and region from `storage.ceph.containers.status`
- [ ] User can select between AWS CLI, s3cmd, and rclone via dropdown (AWS CLI default)
- [ ] Each CLI tool shows step-by-step instructions with copyable code blocks
- [ ] Commands use placeholders for credentials (`<ACCESS_KEY_ID>`, `<SECRET_ACCESS_KEY>`)
- [ ] When opened from bucket page, bucket name is pre-filled in example commands
- [ ] "Manage Credentials" button opens existing ManageCredentialsModal
- [ ] Loading state shows a progress Status "Loading Connection Details…" (timeout: 10s → error state)
- [ ] Error state shows an error Status (Retry only for network failures) instead of the instructions; the tool selector and "Manage Credentials" stay available
- [ ] Modal closes via Close button, Escape key, or clicking outside
- [ ] Analytics events cliSetup.open, cliSetup.close and cliSetup.selectTool are emitted as defined in Analytics
- [ ] Copy feedback via Juno CodeBlock built-in "Copied!" toast

---

## Happy path

1. User navigates to Ceph Object Storage (bucket list page, individual bucket page, or the Setup Required screen shown when the project has no access keys yet).
2. User clicks "More Actions" (bucket list), the actions menu (bucket page), or nothing extra on the Setup Required screen.
3. User clicks "CLI Setup" (menu item, or the button on the Setup Required screen).
4. Modal opens, shows a loading Status "Loading Connection Details…".
5. Modal shows the tool selector (AWS CLI by default) at once; when the API returns endpoint and region, the instructions render.
6. User sees step-by-step instructions with pre-filled endpoint/region and credential placeholders.
7. User optionally switches tool via dropdown (s3cmd, rclone).
8. User copies commands via CodeBlock copy button; sees CodeBlock's built-in "Copied!" feedback.
9. User optionally clicks "Manage Credentials" to open ManageCredentialsModal.
10. User closes modal via Close button, Escape key, or clicking outside.

---

## UI structure

```
┌───────────────────────────────────────────────────────────────────────┐
│ Modal (title="CLI Setup Guide", size="large", onCancel,               │
│        cancelButtonLabel="Close", closeOnBackdropClick, no onConfirm) │
├───────────────────────────────────────────────────────────────────────┤
│ Body: Stack (direction="vertical", gap="4")                           │
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │ Stack (direction="horizontal", className="justify-end")           │ │
│ │   Button "Manage Credentials" (default variant)                   │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │ Select (id="cli-setup-tool", label="CLI Tool")                    │ │
│ │ ├── AWS CLI (default)                                             │ │
│ │ ├── s3cmd                                                         │ │
│ │ └── rclone                                                        │ │
│ └───────────────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────────────┐ │
│ │ State area, one of:                                               │ │
│ │ ├── Status (progress): loading                                    │ │
│ │ ├── Status (error): error                                         │ │
│ │ └── CliToolInstructions: success                                  │ │
│ └───────────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────────┤
│ Footer: Juno built-in footer with a single "Close" button             │
└───────────────────────────────────────────────────────────────────────┘
```

Info-only modal per copilot-instructions B.5: no confirm action, built-in footer, template `ManageCredentialsModal.tsx`. The tool selector and Manage Credentials render in every state (loading/error/success); only the state area changes.

| Element            | Component             | Notes                                                                                                                       |
| ------------------ | --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Modal container    | Juno `Modal`          | `size="large"`, `title`, `onCancel`, ``cancelButtonLabel={t`Close`}``, `closeOnBackdropClick` (the Juno default is `false`) |
| Tool selector      | Juno `Select`         | `Select` + `SelectOption`; AWS CLI / s3cmd / rclone; AWS CLI default; every state                                           |
| Instructions       | `CliToolInstructions` | Custom component, success state only                                                                                        |
| Code blocks        | Juno `CodeBlock`      | `content={code}`; `copy` defaults to `true`, and the built-in "Copied!" feedback comes with it                              |
| Loading state      | Juno `Status`         | `status="progress"`, `title="Loading Connection Details…"`                                                                  |
| Error state        | Juno `Status`         | `status="error"` with `aria-live="assertive"` and a Retry `Button` in `action` (error severity, not warning)                |
| Manage Credentials | Juno `Button`         | Default variant, in the body, every state                                                                                   |
| Close              | Built-in footer       | Cancel button from `cancelButtonLabel`                                                                                      |

### Instructions structure (per tool)

Each tool renders via `CliToolInstructions` component:

```tsx
<Stack direction="vertical" gap="4">
  <p className="font-bold">{t`Prerequisites`}</p>
  <ul className="list-disc pl-6">
    <li>{t`Install AWS CLI v2`}</li>
    <li>{t`An access key ID and secret access key (see Manage Credentials)`}</li>
  </ul>
  <ol className="list-decimal space-y-4 pl-6">
    {steps.map((step) => (
      <li key={step.id}>
        <p className="mb-2">{stepLabel(step.id)}</p>
        <CodeBlock content={step.code} />
      </li>
    ))}
  </ol>
</Stack>
```

`CodeBlock` copies the rendered text, so `code` holds only runnable commands or config text, with no `$ ` prompt and no sample output.

Snippet data via `getCliSnippets(tool, { endpoint, region, bucketName? })` returning `{ prerequisites: string[], steps: CliStep[] }`. When `bucketName` is omitted (bucket list or Setup Required entry), commands use the `<bucket-name>` placeholder. The bucket page passes its bucket name.

---

## State model

| State   | What triggers entry           | What the user sees                                                                               |
| ------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Loading | Modal opens; API call starts  | Tool selector + Manage Credentials, plus progress Status "Loading Connection Details…"           |
| Error   | API error or 10s timeout      | Tool selector + Manage Credentials, plus error Status with Retry; no instructions or code blocks |
| Success | API returns endpoint + region | Tool selector + Manage Credentials, plus instructions with code blocks                           |

**Transitions:**

- → Loading: User clicks "CLI Setup" (menu item or Setup Required button)
- Loading → Success: API returns `{ endpoint, region }` within 10s
- Loading → Error: API error or timeout (10s)
- Error → Loading: User clicks Retry (network failures only)

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

**Error responses** (tRPC codes that `status` can actually return):

| Code / failure                                    | Meaning                                                                                                                                                                                                      | UI treatment                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `UNAUTHORIZED`                                    | Session expired or revoked                                                                                                                                                                                   | The modal handles it itself (see Error handling)                                                      |
| `NOT_FOUND`                                       | Project not accessible with the current session (from project scoping in `packages/aurora/src/server/trpc.ts`)                                                                                               | Error Status with the server message, no Retry                                                        |
| `INTERNAL_SERVER_ERROR`                           | The catalog has no `ceph` service or endpoint, or the server has no Ceph region configured (`cephRegion` / `CEPH_REGION`; `resolveS3Config` in `packages/aurora/src/server/Storage/cephProcedure.ts` throws) | Error Status with the server message, no Retry. These are deployment problems that a retry can't fix. |
| Network failure (`error.data?.code` is undefined) | The request never got a tRPC response                                                                                                                                                                        | Error Status with network text + Retry                                                                |

`status` never returns `FORBIDDEN`: missing EC2 credentials yield `hasCredentials: false`, not an error. The FORBIDDEN for missing credentials comes only from `getCephClient`/`cephProtectedProcedure`, which `status` does not use.

---

## Error handling

| Failure mode                                    | What the user sees                                                                                                                                                                                   | Recovery action                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 401 Session expired                             | The modal ends the session and redirects to sign-in; the state area renders nothing meanwhile                                                                                                        | Sign in again                      |
| Network failure                                 | Title "Connection Details Unavailable"; body "Could not load connection details. Check the network connection and try again."                                                                        | Retry button                       |
| Server error (NOT_FOUND, INTERNAL_SERVER_ERROR) | Title "Connection Details Unavailable"; body is `error.message` (as `ManageCredentialsModal.tsx:399-402` does for the same query), followed by "Contact your administrator if the problem persists." | Close modal; contact administrator |

Session expiry: `_auth.tsx` checks the session only in `beforeLoad` on navigation, and no global query handler exists. Follow `network/ports/$portId.tsx`: on `UNAUTHORIZED`, call `trpcClient.auth.terminateUserSession.mutate()`, then ``window.location.replace(`/?redirect=${encodeURIComponent(pathname + search + hash)}`)``.

Server errors get no Retry and no network hint, because the cause is the project or the deployment, not the connection.

**Error UI pattern:**

```tsx
const isNetworkError = !error.data?.code
<Status
  status="error"
  title={t`Connection Details Unavailable`}
  body={
    isNetworkError
      ? t`Could not load connection details. Check the network connection and try again.`
      : `${error.message} ${t`Contact your administrator if the problem persists.`}`
  }
  aria-live="assertive"
  action={
    isNetworkError ? (
      <ButtonRow>
        <Button onClick={() => refetch()} progress={isRefetching}>
          <Trans>Retry</Trans>
        </Button>
      </ButtonRow>
    ) : undefined
  }
/>
```

`Status` renders `role="alert"` for `status="error"` (Juno 9.7.2), and `aria-live="assertive"` is passed through, so both B.6 attributes are present. Same component as the `status` error in `ManageCredentialsModal.tsx`. Juno `Button` has a `progress` prop, not `loading`, so the sketch uses `progress`.

---

## Auth & permission gates

| Role          | Can see CLI Setup | Can view instructions | Can create credentials                                                                      |
| ------------- | ----------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| admin         | ✅ Yes            | ✅ Yes                | ✅ Yes                                                                                      |
| member        | ✅ Yes            | ✅ Yes                | ✅ Yes                                                                                      |
| reader/viewer | ✅ Yes            | ✅ Yes                | ❌ No (Create Access Key hidden or disabled in ManageCredentialsModal, with an explanation) |

CLI Setup is read-only information visible to all roles with access to Ceph Storage. No role gating on the feature itself. Users without permission to create credentials still see the instructions. In ManageCredentialsModal, Create Access Key is hidden or disabled for them, and an info message explains that they lack permission and whom to contact.

---

## Edge cases

| Edge case                                            | Handling                                                                                                                                                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Long endpoint URL                                    | CodeBlock handles natively (overflow/wrap)                                                                                                                                                                      |
| Ceph region or endpoint not configured on the server | `containers.status` fails with INTERNAL_SERVER_ERROR (`resolveS3Config` throws), so the modal shows the error state. A successful response always has a non-empty region, so no fallback placeholder is needed. |
| Project has no access keys (`hasCredentials: false`) | The modal renders normally. The credentials are placeholders anyway, and Manage Credentials is the way to create a key. The modal is also reachable from the Setup Required screen.                             |
| Cached vs fresh data                                 | `staleTime: Infinity` — endpoint/region don't change during session                                                                                                                                             |
| Modal stacking                                       | Mutual exclusion via parent state — "Manage Credentials" closes CLI Setup, opens Credentials modal                                                                                                              |

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

Juno components provide focus handling; the spec adds only the error announcement attributes.

| Requirement            | Handled by                                                         |
| ---------------------- | ------------------------------------------------------------------ |
| Focus trap in modal    | Juno Modal                                                         |
| Focus restore on close | Juno Modal                                                         |
| Escape key closes      | Juno Modal                                                         |
| Copy feedback          | Juno CodeBlock built-in "Copied!"                                  |
| Step order             | `<ol>` list; step labels as text above each CodeBlock              |
| Error announcement     | `Status status="error"` (`role="alert"`) + `aria-live="assertive"` |
| Label associations     | Juno Select `label` prop                                           |

---

## Analytics

| Event                 | Trigger                       | Payload                                      |
| --------------------- | ----------------------------- | -------------------------------------------- |
| `cliSetup.open`       | Modal opens                   | `{}`                                         |
| `cliSetup.close`      | Modal closes                  | `{}`                                         |
| `cliSetup.selectTool` | User selects a different tool | `{ tool: 'aws-cli' \| 's3cmd' \| 'rclone' }` |

---

## Files to create/modify

| File                                    | Action | Purpose                                                                                                                                                                                                                     |
| --------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CliSetupModal.tsx`                     | Create | Modal shell, state management, error handling                                                                                                                                                                               |
| `CliToolInstructions.tsx`               | Create | Renders prerequisites + steps for selected tool                                                                                                                                                                             |
| `cliSetupSnippets.ts`                   | Create | CLI configuration templates for all 3 tools                                                                                                                                                                                 |
| `cliSetupSnippets.test.ts`              | Create | Unit tests for snippet generation                                                                                                                                                                                           |
| `CliSetupModal.test.tsx`                | Create | Component tests                                                                                                                                                                                                             |
| `Credentials/CredentialPrompt.tsx`      | Modify | Optional `onCliSetup?: () => void` prop; when set, `action` becomes `<ButtonRow>` with the primary "Manage Credentials" and a default "CLI Setup" button (pattern: "S3 Authentication Failed" state in `Buckets/index.tsx`) |
| Bucket list page (`Buckets/index.tsx`)  | Modify | "CLI Setup" in More Actions; pass `onCliSetup` to `CredentialPrompt`; mount `CliSetupModal` in the unconditional return next to `ManageCredentialsModal`                                                                    |
| `Credentials/CredentialPrompt.test.tsx` | Modify | Button shown only when `onCliSetup` is set; click calls it                                                                                                                                                                  |
| Bucket detail page                      | Modify | Add "CLI Setup" to actions menu                                                                                                                                                                                             |

---

## Open items

Entry point on the Setup Required screen added by user decision during PR review (#1471, CR2); the original plan had only the bucket list and bucket page.
