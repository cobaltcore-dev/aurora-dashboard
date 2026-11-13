# Business Requirements Document (BRD) for Integrate CLI setup help for Ceph Object Storage

## Document Control

| Field                           | Details                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Feature/Requirement Name**    | Integrate CLI setup help for Ceph Object Storage                                                                   |
| **Submitted By**                | SuperSandro2000                                                                                                    |
| **Team**                        | SCI Frontend Engineering                                                                                           |
| **Date**                        | August 26, 2026                                                                                                    |
| **Priority**                    | [ ] Critical &nbsp;&nbsp; [ ] High &nbsp;&nbsp; [x] Medium &nbsp;&nbsp; [ ] Low                                    |
| **Target Release Date/Quarter** | Q4 2026 (November-December)                                                                                        |
| **Status**                      | [ ] Draft &nbsp;&nbsp; [x] Review &nbsp;&nbsp; [ ] Approved &nbsp;&nbsp; [ ] Rejected &nbsp;&nbsp; [ ] Implemented |

---

## 1. Summary (2-3 sentences)

**What UI functionality are you requesting and why?**

Add an integrated CLI setup guide to the Ceph Object Storage section in Aurora Dashboard. The guide provides ready-to-use configuration with pre-filled endpoint and region for AWS CLI, s3cmd, and rclone, eliminating the need for users to search external documentation or manually assemble connection details. This brings feature parity with Keppel and industry-standard storage consoles (AWS S3, GCS, MinIO).

---

## 2. Business Justification

### Why does this need a UI implementation?

Users currently spend 30-60 minutes searching documentation and manually assembling CLI configuration, when this could take under 5 minutes with in-app guidance. The feature is read-only and low-risk, requiring no backend changes while delivering measurable productivity gains.

### Expected Impact

**If we implement this UI:**

- 90% reduction in CLI setup time (from 30-60 minutes to under 5 minutes)
- 30-50% reduction in CLI-related support tickets ("какой endpoint", "как настроить rclone")
- Elimination of misconfiguration errors (wrong endpoint, missing path-style addressing, wrong region)
- Feature parity with Keppel (SAP internal), AWS S3 Console, GCS, DigitalOcean Spaces, and MinIO
- Measurable adoption via analytics (cliSetup.open/selectTool events)

**If we DON'T implement this UI:**

- ~60 hours of lost user productivity per month across the user base
- ~10 preventable support tickets per month
- Continued user frustration and context-switching (Dashboard → Docs → Terminal → Dashboard)
- Below parity with sibling service (Keppel) and industry competitors
- Risk that users avoid CLI and underutilize storage capabilities

---

## 3. Target Surface

**Which UI surface will host this functionality? (single-select)**

- [x] Elektra / Aurora
- [ ] Greenhouse
- [ ] Other (specify)
- [ ] I don't know

### Why this surface?

Aurora Dashboard is the primary UI for managing cloud infrastructure at SAP. Ceph Object Storage is already managed within Aurora, and the CLI setup guide belongs alongside existing Ceph functionality. Keppel (in the same ecosystem) uses the same pattern successfully.

---

## 4. Out-of-Scope / Non-Goals

**List functionality this UI will explicitly NOT do, and clarify the boundary against adjacent features or services.**

1. **Tool installation instructions** — Vendor responsibility (brew/apt/choco); out of scope
2. **Credential creation/management** — Already exists in ManageCredentialsModal
3. **Real secrets display** — Security concern; credentials shown as placeholders only
4. **Advanced bucket operations** — create/delete/policy/lifecycle/versioning are out of scope
5. **Troubleshooting guides** — Too broad; requires separate UX
6. **SDK configuration** — boto3, aws-sdk-js, etc. belong in developer documentation
7. **Other CLI tools** — Swift CLI, MinIO Client (mc), Cyberduck deferred to future releases
8. **Connection validation** — "Test connection" button requires new API; deferred to v2+
9. **Persistent tool preference** — localStorage for remembering selection; deferred to v1.1
10. **Command localization** — CLI commands are English-only by nature

**In scope:** Tool selection (3 tools), configuration with pre-filled endpoint/region, basic commands (list/upload/download), copyable code blocks, link to Manage Credentials, context-aware bucket name.

---

## 5.1 User Stories

### Definitions

#### User personas:

| Persona         | Description                                                             | Roles    |
| --------------- | ----------------------------------------------------------------------- | -------- |
| Developer       | Integrates S3 into applications, tests upload/download, CI/CD pipelines | `member` |
| DevOps Engineer | Automates backup scripts, deployment artifacts, Infrastructure as Code  | `member` |
| Data Engineer   | Bulk upload/download of datasets, ETL/ML pipelines                      | `member` |
| Project Admin   | Configures storage for team, migrates data, troubleshoots access        | `admin`  |

Primary users are **Developer** and **DevOps Engineer** — they have the highest volume of CLI operations.

#### Summary of UI functionality

A modal dialog accessible from the bucket list, a bucket page, and the Setup Required screen of Ceph Object Storage that displays step-by-step CLI configuration instructions with pre-filled endpoint and region values. Users select their preferred CLI tool (AWS CLI, s3cmd, or rclone) and copy ready-to-use commands.

### Story 1: Configure CLI for S3 storage

**As a** project member working with S3 object storage
**I want to** get ready-to-use CLI configuration with my project's endpoint and region pre-filled
**So that** I can start using command-line tools (AWS CLI, s3cmd, rclone) without searching documentation or manually assembling connection details

**Acceptance Criteria:**

- [ ] "CLI Setup" menu item appears in More Actions menu on bucket list page
- [ ] "CLI Setup" menu item appears in actions menu on individual bucket page
- [ ] "CLI Setup" button appears next to "Manage Credentials" on the "S3 Object Storage: Setup Required" screen (no access keys yet)
- [ ] Modal displays dynamically populated endpoint and region from `storage.ceph.containers.status` tRPC endpoint
- [ ] User can select between AWS CLI, s3cmd, and rclone via dropdown (AWS CLI is default)
- [ ] Each CLI tool shows step-by-step instructions with copyable code blocks
- [ ] Commands use placeholders for credentials (`<ACCESS_KEY_ID>`, `<SECRET_ACCESS_KEY>`)
- [ ] When opened from bucket page, bucket name is pre-filled in example commands
- [ ] "Manage Credentials" button opens existing ManageCredentialsModal
- [ ] Loading state shows a progress Status "Loading Connection Details…" (timeout: 10s → error state)
- [ ] Error state shows an error Status (Retry only for network failures) instead of the instructions; the tool selector and "Manage Credentials" stay available
- [ ] Modal closes via Close button, Escape key, or clicking outside
- [ ] Analytics events: `cliSetup.open`, `cliSetup.close`, `cliSetup.selectTool` (payload: `{ tool: 'aws-cli' | 's3cmd' | 'rclone' }`)
- [ ] Copy feedback: Juno CodeBlock built-in "Copied!" toast on successful copy

**Notes:**

- Tool-specific: AWS CLI shows configure + set region + list/upload/download commands; s3cmd shows ~/.s3cfg config file + commands; rclone shows config block + commands
- All commands use path-style addressing (not virtual-hosted)
- Credentials are always placeholders — real secrets never displayed
- Setup Required entry point added by user decision during PR review (#1471); see spec Open items.

---

## 5.2 Required User Actions

**What actions must users be able to perform in the UI?**

**All personas (admin, member, reader/viewer):**

- [x] Open CLI Setup from bucket list page (More Actions menu)
- [x] Open CLI Setup from bucket page (actions menu)
- [x] Open CLI Setup from the Setup Required screen (button next to Manage Credentials; shown when the project has no access keys)
- [x] Select CLI tool from dropdown (AWS CLI / s3cmd / rclone)
- [x] Copy configuration or commands (per code block)
- [x] Navigate to Manage Credentials (button opens existing modal)
- [x] Close modal (Close button / X / Escape / backdrop click)

**State availability:**

- Select tool and Manage Credentials: available in all states (loading/error/success); instructions render once connection details load
- Copy code: only available in success state (no code blocks during loading/error)

---

## 6. Release Scope & Prioritization

**MVP (v1):** All three CLI tools ship in v1 — AWS CLI, s3cmd, and rclone.

**Rationale:** The incremental effort to add s3cmd and rclone is minimal (~4 hours) compared to the shared infrastructure (modal, select, code blocks). SAP documentation already covers all three tools, so users expect them. Shipping all three avoids repeated test/i18n/review cycles.

**Estimated effort:** ~16 hours total (~2-3 days)

**Deferred to future releases:**

| Feature                       | Target Release | Rationale                              |
| ----------------------------- | -------------- | -------------------------------------- |
| Swift CLI tab                 | v1.1           | Different API, smaller audience        |
| SDK snippets (boto3, aws-sdk) | v1.1           | Different audience (developers vs ops) |
| MinIO Client (mc)             | v1.2           | Niche tool                             |
| "Test connection" button      | v2+            | Requires new API endpoint              |
| Download config file          | v1.1           | Nice-to-have, not essential            |
| Persistent tool preference    | v1.1           | localStorage, minor UX improvement     |
| Cyberduck / GUI clients       | v2+            | Different UX paradigm                  |

---

## 7. API Information

**CRITICAL: This information is required before UI implementation can begin**

### Details

|                           |                                                                                                     | Notes                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Service Documentation** | [Ceph CLI Docs](https://documentation.global.cloud.sap/docs/customer/storage/obj-v2-ceph/ceph-cli/) | Reference for CLI commands                                                                                  |
| **API Docs**              | tRPC `storage.ceph.containers.status`                                                               | Existing endpoint                                                                                           |
| **API Spec**              | `{ project_id: string }` → `{ hasCredentials: boolean, endpoint: string, region: string }`          | Frozen contract                                                                                             |
| **API stable?**           | [x] Yes [ ] No                                                                                      | Production since aurora 2.2.0 (Oct 2026)                                                                    |
| **API available in QA**   | [x] Yes [ ] No                                                                                      | Available wherever the `ceph` service is in the catalog and the server's Ceph region is set (dev, QA, prod) |

### Authentication Mode

Standard Keystone token via project-scoped authentication. No additional auth required — uses existing session.

### Rate Limits / Throttling

No rate limits on `containers.status`. Query uses `staleTime: Infinity` (endpoint/region are deployment constants) and shares cache with ManageCredentialsModal.

### Error Response Shape

Standard tRPC error shape. UI handles with generic error status component.

### Dev Environment

| Property                             | Value                                                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dev/QA endpoint URL**              | https://rgw.st1.eu-de-2.cloud.sap (example)                                                                                                                                               |
| **Region**                           | Varies by deployment (e.g., eu-de-1, eu-de-2)                                                                                                                                             |
| **Test tenant / project ID**         | Any project with Ceph Storage enabled                                                                                                                                                     |
| **Seed data or mock data available** | None needed: the region comes from `createServer({ cephRegion })` (in `apps/dashboard`, the `CEPH_REGION` env var — see `.env.example`); the endpoint comes from the `ceph` catalog entry |
| **Access credentials**               | Standard OpenStack credentials                                                                                                                                                            |

### OpenStack Service Catalog Registration

#### Service Catalog Entry

| Property         | Value             | Confirmed?     |
| ---------------- | ----------------- | -------------- |
| **Service Name** | ceph              | [x] Yes [ ] No |
| **Service Type** | object-store-ceph | [x] Yes [ ] No |
| **API Version**  | v1                | [x] Yes [ ] No |

**No new API endpoints required.** Feature is 100% client-side — command generation happens in the browser from cached data.

---

## 8. Non-Functional Requirements

### Authentication & Authorization

**Auth stack:** Keystone (OpenStack)

**Required roles or equivalent:** None — CLI Setup is read-only information visible to all roles with access to Ceph Storage.

**Scope:** Project-scoped

**Who is explicitly denied?** No one with project access. The feature shows public information (endpoint, region, example commands with placeholders). Users without permission to create credentials will see the instructions; in ManageCredentialsModal the Create Access Key action is hidden or disabled for them and an info message explains why.

| Role          | Can see CLI Setup | Can view instructions | Can create credentials                                                                      |
| ------------- | ----------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| admin         | ✅ Yes            | ✅ Yes                | ✅ Yes                                                                                      |
| member        | ✅ Yes            | ✅ Yes                | ✅ Yes                                                                                      |
| reader/viewer | ✅ Yes            | ✅ Yes                | ❌ No (Create Access Key hidden or disabled in ManageCredentialsModal, with an explanation) |

### Dependencies on Other Teams or Services

**Blocking services:** None

**Cross-team approvals needed:** None — feature is 100% client-side within aurora-dashboard

**Expected dependency timelines:** N/A — can start immediately

**Available dependencies (already in production):**

- `containers.status` endpoint (aurora 2.2.0+)
- ManageCredentialsModal (integration point)
- Juno UI components (CodeBlock, Select, Modal)

---

## 9. Rollout & Support

### Rollout Strategy

**How will this UI be released?**

- [ ] Feature flag
- [ ] Region-by-region rollout
- [ ] Dark launch
- [ ] Beta cohort
- [x] All-at-once
- [ ] Other

**Rationale:** Low-risk, read-only, client-side feature with easy rollback. No feature flags needed — overhead not justified for simple feature. No regional differences — aurora deploys globally. Standard release process with post-release analytics monitoring.

**Rollback plan:** Revert PR and redeploy if critical issue discovered. Time to recover: ~1-2 hours.

### Who needs to be informed before go-live?

Support team (optional, post-release) — to expect reduced CLI configuration tickets.

---

## Appendix: CLI Command Examples

### AWS CLI

```bash
# 1. Create a profile
aws configure --profile ceph

# 2. Set region and path-style addressing
aws configure set region {region} --profile ceph
aws configure set s3.addressing_style path --profile ceph

# 3. List buckets
aws s3 ls --profile ceph --endpoint-url {endpoint}

# 4. Upload a file
aws s3 cp <local-file> s3://<bucket-name>/ --profile ceph --endpoint-url {endpoint}

# 5. Download an object
aws s3 cp s3://<bucket-name>/<object-key> . --profile ceph --endpoint-url {endpoint}
```

### s3cmd

```ini
# Save as ~/.s3cfg
[default]
access_key = <ACCESS_KEY_ID>
secret_key = <SECRET_ACCESS_KEY>
host_base = {endpoint_host}
host_bucket = {endpoint_host}
bucket_location = {region}
use_https = True
signature_v2 = False
```

### rclone

```ini
# Add to rclone.conf (run "rclone config file" to find it)
[ceph]
type = s3
provider = Ceph
access_key_id = <ACCESS_KEY_ID>
secret_access_key = <SECRET_ACCESS_KEY>
endpoint = {endpoint}
region = {region}
```

Where `{endpoint}`, `{region}`, `{endpoint_host}` are populated from the API, and `<bucket-name>` is replaced by the bucket name when the guide is opened from a bucket page.
