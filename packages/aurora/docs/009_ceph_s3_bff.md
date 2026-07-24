# Ceph S3 Object Storage - BFF Implementation

This implementation provides a Backend for Frontend (BFF) layer for Ceph RADOS Gateway (RGW) S3 API, enabling secure object storage operations through EC2-style credentials managed by OpenStack Keystone Identity service.

## Architecture Overview

The Ceph/S3 BFF layer sits between the Aurora frontend and the Ceph RADOS Gateway, providing:

- **EC2 credential management** via OpenStack Identity API
- **S3 client initialization** using AWS SDK v3 with path-style addressing
- **Type-safe tRPC procedures** for containers (buckets) and objects
- **Error mapping** from S3 error codes to tRPC error codes
- **Project-scoped isolation** — credentials and operations are scoped to the current Keystone project

```
┌─────────────────┐
│  Aurora Client  │
└────────┬────────┘
         │ tRPC
         ▼
┌─────────────────┐
│   Ceph S3 BFF   │
│                 │
│  ┌───────────┐  │
│  │ EC2 Creds │◄─┼──── OpenStack Keystone Identity
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ S3 Client │  │
│  └─────┬─────┘  │
└────────┼────────┘
         │ S3 API
         ▼
┌─────────────────┐
│  Ceph RGW (S3)  │
└─────────────────┘
```

### Why EC2 Credentials?

Ceph RGW exposes an S3-compatible API that uses AWS Signature v4 for authentication. OpenStack Keystone provides **EC2 credentials** (access key + secret key) as a credential type specifically for S3 API access. These credentials:

- Are scoped to a specific **user + project** pair
- Are stored securely in Keystone (secret key never returned after creation)
- Can be created, listed, and deleted via the Identity API
- Work seamlessly with AWS SDK S3 clients

## Files Structure

```
packages/aurora/src/server/Storage/
├── cephProcedure.ts              # Base procedures & middleware
├── middleware/
│   └── resolveEC2Credential.ts   # Credential resolution logic
├── clients/
│   └── s3Client.ts               # S3Client factory
├── routers/
│   ├── index.ts                  # Router exports
│   ├── ceph/
│   │   ├── ec2CredentialRouter.ts    # Credential CRUD operations
│   │   ├── containerRouter.ts        # Bucket operations
│   │   ├── objectRouter.ts           # Object operations
│   │   └── versioningRouter.ts       # Versioning operations
├── helpers/
│   └── s3ErrorMapper.ts          # S3 → tRPC error mapping
└── types/
    ├── ceph.ts                   # Zod schemas & TypeScript types
    └── versioning.ts             # Versioning schemas & types
├── helpers/
│   └── s3ErrorMapper.ts          # S3 → tRPC error mapping
└── types/
    ├── ceph.ts                   # Zod schemas & TypeScript types
    └── versioning.ts             # Versioning schemas & types
```

## Authentication Flow

### 1. EC2 Credential Resolution

The `resolveEC2Credential` middleware:

1. Extracts `userId` and `projectId` from the OpenStack token in context
2. Queries Keystone Identity API: `GET /v3/credentials?user_id={userId}&type=ec2`
3. Filters credentials by `project_id` to find the project-scoped credential
4. Parses the JSON `blob` field to extract `{ access, secret }`
5. Returns `{ credentialId, access, secret }` or `null` if not found

**Key point:** This middleware **never creates** credentials — it only resolves existing ones. Credential creation is handled explicitly by the `ec2Credentials.create` tRPC mutation.

### 2. S3 Client Initialization

The `createS3Client` factory:

1. Validates that `access` and `secret` are non-empty
2. Resolves the S3 endpoint:
   - Extract from Ceph service catalog (removes `/swift/v1/...` suffix)
3. Resolves the region from OpenStack service catalog:
   - Extracts the OpenStack region from Ceph service endpoint (e.g., `qa-de-1`, `eu-de-2`)
   - Constructs Ceph-compatible region identifier:
     - Standard format: `ceph-objectstore-st1-{region}` (e.g., `ceph-objectstore-st1-eu-de-2`)
     - Special case: `qa-de-1` uses `ceph-objectstore-ec-st1-qa-de-1` (with "ec" prefix for historical reasons)
   - This identifier is used for:
     - AWS Signature V4 request signing (region field in Authorization header)
     - LocationConstraint in CreateBucket API calls
4. Returns a configured AWS SDK v3 `S3Client` with:
   - `forcePathStyle: true` (required for Ceph RGW — it does not support virtual-hosted-style URLs)
   - Static credentials (access key ID + secret access key)

**Region Configuration:**

Region identifiers are automatically constructed from the OpenStack service catalog:

- Extracts region from Ceph service endpoint (e.g., `qa-de-1`, `eu-de-2`, `staging`)
- Constructs Ceph-compatible identifier using the pattern from Go SDK / Terraform:
  - Standard: `ceph-objectstore-st1-{region}` (e.g., `ceph-objectstore-st1-eu-de-2`)
  - Exception: `qa-de-1` → `ceph-objectstore-ec-st1-qa-de-1` (uses "ec" prefix for historical reasons)
- Used for AWS Signature V4 request signing and LocationConstraint in CreateBucket
- No environment variable override needed — region is auto-detected

See: https://documentation.global.cloud.sap/docs/customer/storage/obj-v2-ceph/ceph-storage-options/

### 3. Middleware Layers

#### `cephCredentialMiddleware`

Base middleware that:

- Resolves EC2 credentials (may be `null`)
- Adds to context:
  - `cephCredentials: EC2CredentialResult | null`
  - `getCephClient: () => S3Client` — **throws FORBIDDEN** if credentials are missing

This middleware **does not throw** on missing credentials, allowing status checks.

#### `cephProcedure`

Exposes the base middleware for procedures that handle missing credentials gracefully (e.g., `status` query).

#### `cephProtectedProcedure`

Extends `cephCredentialMiddleware` with an additional layer that:

- Throws `TRPCError({ code: "FORBIDDEN", message: NO_CEPH_CREDENTIALS })` if `ctx.cephCredentials` is `null`
- Used for all actual S3 operations (list buckets, get objects, etc.)

#### `cephUploadProcedure`

A dedicated procedure for octet-stream uploads (`uploadObject`). It exists because `octetInputParser` **cannot** be chained onto `cephProtectedProcedure`: that procedure is built on `projectScopedProcedure`, which bundles a `project_id` object input, and tRPC refuses to merge an object input parser with a raw-stream parser (`"All input parsers did not resolve to an object"`). This is the same reason the Swift BFF's `uploadObject` runs on the base `protectedProcedure`.

Instead of a tRPC input, it takes the project id from the `x-upload-project-id` request header (the body is the file), then:

1. Rescopes the OpenStack session to that project via `ctx.rescopeSession({ projectId })` (throws `UNAUTHORIZED` if the user can't access the project)
2. Resolves EC2 credentials and S3 endpoint/region against the rescoped session (throws `FORBIDDEN` / `NO_CEPH_CREDENTIALS` if none)
3. Exposes the same `getCephClient(): S3Client` factory as `cephProtectedProcedure`, so the S3 client targets the upload's project

## tRPC Router Hierarchy

```typescript
storage.ceph
  ├── ec2Credentials
  │   ├── list()        → Ec2Credential[]
  │   ├── create()      → Ec2CredentialWithSecret
  │   └── delete(id)    → { success: true }
  ├── containers
  │   ├── status()      → { hasCredentials: boolean }
  │   ├── list()        → Container[]
  │   ├── getDetails()  → ContainerDetails
  │   ├── create()      → { success: boolean }
  │   ├── delete()      → { success: boolean }
  │   └── empty()       → { success: boolean, deletedCount: number }
  ├── objects
  │   ├── list()            → { objects, folders, isTruncated, nextContinuationToken }
  │   ├── getDetails()      → S3ObjectDetails
  │   ├── delete()          → { success: boolean }
  │   ├── createFolder()    → { success: boolean }
  │   ├── copy()            → { success: boolean, etag?: string }
  │   ├── move()            → { success: boolean, etag?: string }
  │   ├── updateMetadata()  → { success: boolean }
  │   ├── downloadObject()       → AsyncIterable<{ chunk, downloaded, total, contentType?, filename? }>
  │   └── watchDownloadProgress() → AsyncIterable<{ downloaded, total, percent }>  (subscription)
  └── versioning
      ├── getStatus()         → { status: 'Enabled' | 'Suspended' | 'Unversioned' }
      ├── setStatus()         → { success: boolean }
      ├── listVersions()      → { versions, deleteMarkers, isTruncated, nextKeyMarker?, nextVersionIdMarker? }
      ├── listObjectVersions() → ObjectVersion[]
      ├── deleteVersion()     → { success: boolean }
      └── restoreVersion()    → { success: boolean, versionId: string }
```

## Available Procedures

### EC2 Credentials (`storage.ceph.ec2Credentials`)

#### `list`

Lists EC2 credentials for the current user scoped to the given project. **The secret key is never returned** — only the access key ID.

**Input:**

```typescript
{
  project_id: string
}
```

**Output:**

```typescript
Ec2Credential[]

interface Ec2Credential {
  id: string           // Credential UUID
  access: string       // Access key ID (public)
  user_id: string      // Keystone user ID
  project_id: string   // Keystone project ID
}
```

**Example:**

```typescript
const credentials = await trpc.storage.ceph.ec2Credentials.list.query({
  project_id: "abc123",
})
// [{ id: "...", access: "3F8D...", user_id: "...", project_id: "abc123" }]
```

---

#### `create`

Creates a new EC2 credential for the current user scoped to the given project. **The secret key is returned exactly once** in this response and never stored or shown again.

**Input:**

```typescript
{
  project_id: string
}
```

**Output:**

```typescript
Ec2CredentialWithSecret

interface Ec2CredentialWithSecret extends Ec2Credential {
  secret: string // Secret access key (returned ONLY on creation)
}
```

**Example:**

```typescript
const credential = await trpc.storage.ceph.ec2Credentials.create.mutate({
  project_id: "abc123",
})

// Save the secret immediately!
console.log("Access Key:", credential.access)
console.log("Secret Key:", credential.secret) // ONLY shown here
```

**Important:** Display the secret key to the user immediately and instruct them to save it securely. It cannot be retrieved later.

---

#### `delete`

Deletes an EC2 credential by ID. Returns success even if the credential is not found (idempotent).

**Input:**

```typescript
{
  project_id: string,
  credentialId: string
}
```

**Output:**

```typescript
{
  success: true
}
```

**Example:**

```typescript
await trpc.storage.ceph.ec2Credentials.delete.mutate({
  project_id: "abc123",
  credentialId: "cred-uuid",
})
```

---

### Containers (`storage.ceph.containers`)

#### `status`

Checks whether the current user has EC2 credentials configured for Ceph S3 access. **Does not throw** on missing credentials.

**Input:**

```typescript
{
  project_id: string
}
```

**Output:**

```typescript
{
  hasCredentials: boolean
}
```

**Example:**

```typescript
const { hasCredentials } = await trpc.storage.ceph.containers.status.query({
  project_id: "abc123",
})

if (!hasCredentials) {
  // Prompt user to create credentials
}
```

---

#### `list`

Lists all S3 buckets (containers) accessible with the user's EC2 credentials.

**Input:**

```typescript
{
  project_id: string
}
```

**Output:**

```typescript
Container[]

interface Container {
  name: string
  creationDate?: string  // ISO 8601
}
```

**Example:**

```typescript
const containers = await trpc.storage.ceph.containers.list.query({
  project_id: "abc123",
})

console.log(containers)
// [{ name: "my-bucket", creationDate: "2024-03-15T10:30:00.000Z" }]
```

---

#### `getDetails`

Retrieves metadata for a specific container (bucket). Currently returns basic information; can be extended to include object count and size if Ceph RGW provides those headers.

**Input:**

```typescript
{
  project_id: string,
  containerName: string
}
```

**Output:**

```typescript
ContainerDetails

interface ContainerDetails {
  name: string
  objectCount?: number
  sizeBytes?: number
}
```

**Example:**

```typescript
const details = await trpc.storage.ceph.containers.getDetails.query({
  project_id: "abc123",
  containerName: "my-bucket",
})
```

---

#### `create`

Creates a new S3 bucket (container) with the specified name.

**Input:**

```typescript
{
  project_id: string,
  containerName: string
}
```

**Output:**

```typescript
{
  success: boolean
}
```

**Example:**

```typescript
await trpc.storage.ceph.containers.create.mutate({
  project_id: "abc123",
  containerName: "my-new-bucket",
})
```

**Validation:**

- Bucket names must be between 3-63 characters
- Can contain lowercase letters, numbers, hyphens, and periods
- Must start and end with a letter or number
- Cannot contain consecutive periods or hyphens
- Cannot be formatted as an IP address

---

#### `delete`

Deletes an empty S3 bucket. Throws `PRECONDITION_FAILED` error if the bucket contains objects.

**Input:**

```typescript
{
  project_id: string,
  containerName: string
}
```

**Output:**

```typescript
{
  success: boolean
}
```

**Example:**

```typescript
await trpc.storage.ceph.containers.delete.mutate({
  project_id: "abc123",
  containerName: "old-bucket",
})
```

**Note:** The bucket must be empty before deletion. Use `containers.empty` to delete all objects first if needed.

---

#### `empty`

Deletes all objects in a bucket (bulk delete operation). Useful before deleting the bucket itself.

**Input:**

```typescript
{
  project_id: string,
  containerName: string
}
```

**Output:**

```typescript
{
  success: boolean
  deletedCount: number // Number of objects deleted
}
```

**Example:**

```typescript
const result = await trpc.storage.ceph.containers.empty.mutate({
  project_id: "abc123",
  containerName: "my-bucket",
})

console.log(`Deleted ${result.deletedCount} objects`)
```

**Behavior:**

- Iterates through all objects in the bucket using pagination
- Deletes objects in batches using S3 `DeleteObjects` command (up to 1000 per batch)
- Returns total count of deleted objects
- If deletion fails for some objects, throws error with details

---

### Objects (`storage.ceph.objects`)

#### `list`

Lists objects in a container with optional prefix filtering, delimiter for folder-style hierarchy, and pagination support.

**Input:**

```typescript
{
  project_id: string,
  containerName: string,
  prefix?: string,              // Filter by prefix (e.g., "photos/2024/")
  delimiter?: string,           // Default: "/" (enables folder hierarchy)
  maxKeys?: number,             // Max results per page (default: 1000)
  continuationToken?: string    // For pagination
}
```

**Output:**

```typescript
ListObjectsOutput

interface ListObjectsOutput {
  objects: S3Object[]
  folders: S3FolderPrefix[]
  isTruncated: boolean
  nextContinuationToken?: string
}

interface S3Object {
  key: string // Full path: "photos/2024/img.jpg"
  lastModified?: string // ISO 8601
  size: number // Bytes
  etag?: string // ETag/MD5
  storageClass?: string // e.g., "STANDARD"
}

interface S3FolderPrefix {
  prefix: string // e.g., "photos/2024/"
}
```

**Example:**

```typescript
// List top-level items (folders + objects)
const { objects, folders, isTruncated, nextContinuationToken } = await trpc.storage.ceph.objects.list.query({
  project_id: "abc123",
  containerName: "my-bucket",
  delimiter: "/", // Enable folder hierarchy
})

console.log(
  "Folders:",
  folders.map((f) => f.prefix)
)
// ["documents/", "photos/", "videos/"]

console.log(
  "Objects:",
  objects.map((o) => o.key)
)
// ["README.txt", "config.json"]

// List objects inside "photos/"
const photosPage = await trpc.storage.ceph.objects.list.query({
  project_id: "abc123",
  containerName: "my-bucket",
  prefix: "photos/",
  delimiter: "/",
})
```

**Folder Hierarchy Notes:**

- With `delimiter: "/"`, S3 treats prefixes before the delimiter as "folders"
- `folders` contains `CommonPrefixes` (pseudo-folders)
- `objects` contains actual objects at the current level
- No `delimiter` → flat list of all objects with the given prefix

---

#### `getDetails`

Retrieves metadata for a specific object without downloading its content (S3 `HeadObject` operation).

**Input:**

```typescript
{
  project_id: string,
  containerName: string,
  objectKey: string
}
```

**Output:**

```typescript
S3ObjectDetails

interface S3ObjectDetails {
  key: string
  size: number
  lastModified?: string
  etag?: string
  contentType?: string
  storageClass?: string
  metadata?: Record<string, string> // Custom user metadata
}
```

**Example:**

```typescript
const details = await trpc.storage.ceph.objects.getDetails.query({
  project_id: "abc123",
  containerName: "my-bucket",
  objectKey: "documents/report.pdf",
})

console.log(details)
// {
//   key: "documents/report.pdf",
//   size: 1048576,
//   contentType: "application/pdf",
//   lastModified: "2024-03-15T14:22:00.000Z"
// }
```

---

#### `delete`

Deletes a specific object from a container (S3 `DeleteObject` operation).

**Input:**

```typescript
{
  project_id: string,
  containerName: string,
  objectKey: string
}
```

**Output:**

```typescript
{
  success: boolean
}
```

**Example:**

```typescript
await trpc.storage.ceph.objects.delete.mutate({
  project_id: "abc123",
  containerName: "my-bucket",
  objectKey: "documents/old-report.pdf",
})
```

---

#### `createFolder`

Creates a pseudo-folder by uploading a zero-byte object with a trailing `/` (S3 `PutObject` operation).

**Input:**

```typescript
{
  project_id: string,
  containerName: string,
  folderKey: string  // Must end with "/"
}
```

**Output:**

```typescript
{
  success: boolean
}
```

**Example:**

```typescript
await trpc.storage.ceph.objects.createFolder.mutate({
  project_id: "abc123",
  containerName: "my-bucket",
  folderKey: "new-folder/",
})
```

**Note:** S3 folders are pseudo-directories implemented as zero-byte objects with keys ending in `/`.

---

#### `copy`

Copies an object to a new location within the same bucket or to a different bucket (S3 `CopyObject` operation).

**Input:**

```typescript
{
  project_id: string,
  sourceBucket: string,
  sourceKey: string,
  destinationBucket: string,
  destinationKey: string,
  overwrite?: boolean  // Default: false
}
```

**Output:**

```typescript
{
  success: boolean
  etag?: string
}
```

**Example:**

```typescript
await trpc.storage.ceph.objects.copy.mutate({
  project_id: "abc123",
  sourceBucket: "my-bucket",
  sourceKey: "documents/report.pdf",
  destinationBucket: "my-bucket",
  destinationKey: "archive/report-2024.pdf",
  overwrite: false,
})
```

**Behavior:**

- If `overwrite: false` and destination exists, throws `CONFLICT` error
- If `overwrite: true`, replaces existing object at destination
- Source object remains unchanged (copy, not move)

---

#### `move`

Moves an object by copying it to a new location and deleting the source (composite operation: `CopyObject` + `DeleteObject`).

**Input:**

```typescript
{
  project_id: string,
  sourceBucket: string,
  sourceKey: string,
  destinationBucket: string,
  destinationKey: string,
  overwrite?: boolean  // Default: false
}
```

**Output:**

```typescript
{
  success: boolean
  etag?: string
}
```

**Example:**

```typescript
await trpc.storage.ceph.objects.move.mutate({
  project_id: "abc123",
  sourceBucket: "my-bucket",
  sourceKey: "temp/draft.pdf",
  destinationBucket: "my-bucket",
  destinationKey: "final/published.pdf",
  overwrite: false,
})
```

**Behavior:**

- Copies the object to destination first
- Only deletes source if copy succeeds
- If copy fails, source remains unchanged (atomic operation)
- If `overwrite: false` and destination exists, throws `CONFLICT` error before copying

---

#### `updateMetadata`

Updates custom metadata on an object by copying it to itself with new metadata (S3 `CopyObject` with `REPLACE` metadata directive).

**Input:**

```typescript
{
  project_id: string,
  containerName: string,
  objectKey: string,
  metadata: Record<string, string>  // Custom metadata (x-amz-meta-* headers)
}
```

**Output:**

```typescript
{
  success: boolean
}
```

**Example:**

```typescript
await trpc.storage.ceph.objects.updateMetadata.mutate({
  project_id: "abc123",
  containerName: "my-bucket",
  objectKey: "documents/report.pdf",
  metadata: {
    author: "John Doe",
    department: "Engineering",
    version: "2.0",
  },
})
```

**Note:**

- Metadata keys are automatically prefixed with `x-amz-meta-` by S3
- This operation does not re-upload the object content
- Only metadata is changed; ETag remains the same

---

#### `uploadObject`

Uploads a file to a bucket by streaming the request body through the BFF into an S3 `PutObjectCommand`. The body is consumed via `octetInputParser`, so the object is never buffered whole in memory; per-chunk progress is published so a concurrent `watchUploadProgress` subscription can drive a progress bar. Mirrors the Swift BFF `uploadObject`.

Because the request body **is** the raw file, all metadata travels as custom request headers rather than a tRPC input, and the procedure runs on `cephUploadProcedure` (see [Middleware Layers](#3-middleware-layers)) which rescopes from `x-upload-project-id`.

**Request headers:**

| Header                | Required | Description                                                                                     |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `x-upload-project-id` | yes      | Project id — rescopes the S3 client and scopes progress so tenants can't observe each other     |
| `x-upload-container`  | yes      | Target bucket name                                                                              |
| `x-upload-object`     | yes      | Full object key, e.g. `folder/file.txt`                                                         |
| `x-upload-type`       | no       | MIME type detected client-side (defaults to `application/octet-stream`)                         |
| `x-upload-size`       | yes      | File size in bytes — used as the S3 `ContentLength` (required for a streaming body)             |
| `x-upload-id`         | yes      | Client-computed `<bucket>:<objectKey>:<uuid>` correlating the upload with `watchUploadProgress` |

**Input:** the raw file stream (`octetInputParser`); there is no JSON input object.

**Output:**

```typescript
{
  success: true
}
```

**Example:**

```typescript
const uploadId = `${bucket}:${objectKey}:${crypto.randomUUID()}`

// Open the progress subscription first (see watchUploadProgress), then:
await trpcClient.storage.ceph.objects.uploadObject.mutate(file, {
  context: {
    headers: {
      "x-upload-project-id": "abc123",
      "x-upload-container": "my-bucket",
      "x-upload-object": "documents/report.pdf",
      "x-upload-type": file.type || "application/octet-stream",
      "x-upload-size": String(file.size),
      "x-upload-id": uploadId,
    },
  },
  signal: abortController.signal, // Cancel button / tab close aborts the PUT
})
```

**Notes:**

- `ContentLength` (from `x-upload-size`) is required because S3/Ceph needs the object size up front for a streaming `Body`.
- Cancellation is wired through `ctx.req.signal` to the AWS SDK's `{ abortSignal }`; a user-initiated abort is surfaced to the caller as a rejection (the modal reports "cancelled") but is **not** pushed to the progress watcher.
- Progress is scoped by `project_id`, so a user can never observe another tenant's transfer.
- Multipart upload is **not** used — a single `PutObjectCommand` streams the whole body. See Known Issues for large-file implications.

---

#### `watchUploadProgress`

Subscribes to live progress for an in-flight upload identified by `uploadId`. Open this **before** calling `uploadObject` so no early events are missed; a snapshot of current progress is emitted immediately for late subscribers. Mirrors `watchDownloadProgress`.

**Input:**

```typescript
{
  project_id: string,
  uploadId: string   // Same id passed to uploadObject via x-upload-id
}
```

**Output:** an async iterable (subscription) yielding progress:

```typescript
{
  uploaded: number,  // cumulative bytes streamed to S3
  total: number,     // total file size in bytes (from x-upload-size)
  percent: number    // 0–100 (0 when total is unknown)
}
```

**Example:**

```typescript
const uploadId = `${bucket}:${objectKey}:${crypto.randomUUID()}`

trpc.storage.ceph.objects.watchUploadProgress.subscribe(
  { project_id: "abc123", uploadId },
  { onData: ({ percent }) => setProgress(percent) }
)

await trpcClient.storage.ceph.objects.uploadObject.mutate(file, {
  context: {
    headers: {
      /* x-upload-* headers, including x-upload-id: uploadId */
    },
  },
})
```

**Notes:**

- The subscription completes when the upload finishes and re-throws if the upload errors (except on abort).
- If no events arrive within 30 s (e.g. the upload finished before the subscription opened), it ends gracefully rather than hanging.

---

#### `downloadObject`

Downloads an object by streaming its content through the BFF as base64-encoded chunks via a tRPC async iterable (S3 `GetObjectCommand`). The server never buffers the whole object in memory, and per-chunk progress is published so a concurrent `watchDownloadProgress` subscription can drive a progress bar. This is a **direct stream** — no presigned/temporary URLs are issued.

**Input:**

```typescript
{
  project_id: string,
  containerName: string,
  objectKey: string,
  filename: string,    // Suggested download filename (echoed in the first chunk)
  downloadId: string   // Client-computed "<bucket>:<objectKey>:<uuid>" correlating
                       // the stream with a watchDownloadProgress subscription
}
```

**Output:** an async iterable yielding chunks:

```typescript
{
  chunk: string,         // base64-encoded Uint8Array slice of the object
  downloaded: number,    // cumulative bytes streamed so far
  total: number,         // total object size in bytes (0 if unknown)
  contentType?: string,  // present only in the first chunk
  filename?: string      // present only in the first chunk
}
```

**Example:**

```typescript
const downloadId = `${bucket}:${objectKey}:${crypto.randomUUID()}`

const iterable = await trpc.storage.ceph.objects.downloadObject.mutate({
  project_id: "abc123",
  containerName: "my-bucket",
  objectKey: "documents/report.pdf",
  filename: "report.pdf",
  downloadId,
})

const parts: Uint8Array[] = []
let contentType = "application/octet-stream"
for await (const { chunk, contentType: ct } of iterable) {
  if (ct) contentType = ct
  parts.push(Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0)))
}
const blob = new Blob(parts, { type: contentType })
// → wrap in an object URL and trigger an <a download>
```

**Notes:**

- Each chunk is base64-encoded because tRPC's iterable transport is JSON/SSE-based and yielded values must be JSON-serializable.
- `contentType` and `filename` are sent only in the first chunk to avoid repetition.
- Progress is scoped by `project_id`, so a user can never observe another tenant's transfer.
- An empty object yields no chunks (the loop simply never runs).

**Content-Type resolution:**

S3/Ceph often can't be trusted to report a useful `Content-Type` — RGW defaults to `binary/octet-stream` when none was set on upload, and some upload tools store an unrelated type (e.g. `application/x-www-form-urlencoded`). Since the raw stored value directly determines whether the frontend can preview a file inline vs. must force a download, `downloadObject` resolves the type as follows before yielding the first chunk:

1. If the object key has a recognized extension (`.jpg`, `.pdf`, `.txt`, `.png`, etc.), the MIME type is derived from that extension and takes priority over whatever S3 returned.
2. Otherwise (unknown or missing extension — e.g. a UUID-style key), the `ContentType` from the S3 `GetObjectCommand` response is used as-is, falling back to `application/octet-stream` if absent.

This means the `contentType` yielded in the first chunk may differ from the object's stored `Content-Type` in S3. Consumers that need the _raw_ stored value (rather than the resolved/display value) should call `getDetails` instead, which returns the S3 metadata unmodified.

The Ceph frontend (`ObjectsTableView`) uses this resolved `contentType` to decide row-click behavior: safe browser-previewable types (passive media `image/*` excluding `image/svg+xml`, `video/*`, `audio/*`, plus `application/pdf` and `text/plain`) open in a new tab; everything else downloads. The context-menu **Download** action always forces a download regardless of type.

---

#### `watchDownloadProgress`

Subscribes to live progress for an in-flight download identified by `downloadId`. Open this **before** calling `downloadObject` so no early events are missed; a snapshot of current progress is emitted immediately for late subscribers.

**Input:**

```typescript
{
  project_id: string,
  downloadId: string   // Same id passed to downloadObject
}
```

**Output:** an async iterable (subscription) yielding progress:

```typescript
{
  downloaded: number,  // cumulative bytes streamed
  total: number,       // total object size in bytes (0 if unknown)
  percent: number      // 0–100 (0 when total is unknown)
}
```

**Example:**

```typescript
const downloadId = `${bucket}:${objectKey}:${crypto.randomUUID()}`

trpc.storage.ceph.objects.watchDownloadProgress.subscribe(
  { project_id: "abc123", downloadId },
  { onData: ({ percent }) => setProgress(percent) }
)

await trpc.storage.ceph.objects.downloadObject.mutate({
  project_id: "abc123",
  containerName: "my-bucket",
  objectKey: "documents/report.pdf",
  filename: "report.pdf",
  downloadId,
})
```

**Notes:**

- The subscription completes when the download finishes and re-throws if the download errors.
- If no events arrive within 30 s (e.g. the download finished before the subscription opened), it ends gracefully rather than hanging.

---

### Versioning (`storage.ceph.versioning`)

Bucket versioning allows keeping multiple variants of objects in the same bucket, enabling recovery from accidental deletions and overwrites.

#### `getStatus`

Gets the current versioning status for a bucket.

**Input:**

```typescript
{
  project_id: string,
  bucket: string
}
```

**Output:**

```typescript
VersioningStatus

interface VersioningStatus {
  status: "Enabled" | "Suspended" | "Unversioned"
  mfaDelete?: "Enabled" | "Disabled"
}
```

**Example:**

```typescript
const status = await trpc.storage.ceph.versioning.getStatus.query({
  project_id: "abc123",
  bucket: "my-bucket",
})

console.log(status)
// { status: "Enabled" }
```

**States:**

- `Unversioned` — Versioning has never been enabled (default state)
- `Enabled` — All new objects receive unique version IDs
- `Suspended` — Stops creating new versions, existing versions preserved

---

#### `setStatus`

Enables or suspends versioning on a bucket.

**Important:** Once enabled, versioning cannot be fully disabled (only suspended).

**Input:**

```typescript
{
  project_id: string,
  bucket: string,
  status: 'Enabled' | 'Suspended'
}
```

**Output:**

```typescript
{
  success: boolean
}
```

**Example:**

```typescript
// Enable versioning
await trpc.storage.ceph.versioning.setStatus.mutate({
  project_id: "abc123",
  bucket: "my-bucket",
  status: "Enabled",
})

// Suspend versioning (keeps existing versions)
await trpc.storage.ceph.versioning.setStatus.mutate({
  project_id: "abc123",
  bucket: "my-bucket",
  status: "Suspended",
})
```

---

#### `listVersions`

Lists all versions of objects in a bucket. Returns both regular versions and delete markers. Supports pagination.

**Input:**

```typescript
{
  project_id: string,
  bucket: string,
  prefix?: string,              // Filter by prefix
  keyMarker?: string,           // For pagination
  versionIdMarker?: string,     // For pagination
  maxKeys?: number              // Max results (default: 100, max: 1000)
}
```

**Output:**

```typescript
ListVersionsOutput

interface ListVersionsOutput {
  versions: ObjectVersion[]
  deleteMarkers: ObjectVersion[]
  isTruncated: boolean
  nextKeyMarker?: string
  nextVersionIdMarker?: string
  prefix?: string
  maxKeys?: number
}

interface ObjectVersion {
  key: string
  versionId: string
  isLatest: boolean
  lastModified?: string // ISO date string
  size: number
  storageClass?: string
  owner?: { displayName?: string; id?: string }
  etag?: string
  isDeleteMarker: boolean
}
  owner?: { displayName?: string; id?: string }
  etag?: string
  isDeleteMarker: boolean
}
```

**Example:**

```typescript
// First page
const result = await trpc.storage.ceph.versioning.listVersions.query({
  project_id: "abc123",
  bucket: "my-bucket",
  maxKeys: 100,
})

console.log(`Found ${result.versions.length} versions`)
console.log(`Found ${result.deleteMarkers.length} delete markers`)

// Next page (if truncated)
if (result.isTruncated) {
  const nextPage = await trpc.storage.ceph.versioning.listVersions.query({
    project_id: "abc123",
    bucket: "my-bucket",
    keyMarker: result.nextKeyMarker,
    versionIdMarker: result.nextVersionIdMarker,
  })
}
```

---

#### `listObjectVersions`

Lists all versions for a specific object key. Returns versions sorted by date descending (newest first).

**Input:**

```typescript
{
  project_id: string,
  bucket: string,
  key: string
}
```

**Output:**

```typescript
ObjectVersion[] // Sorted newest first
```

**Example:**

```typescript
const versions = await trpc.storage.ceph.versioning.listObjectVersions.query({
  project_id: "abc123",
  bucket: "my-bucket",
  key: "documents/report.pdf",
})

versions.forEach((v) => {
  console.log(`Version ${v.versionId}:`)
  console.log(`  Latest: ${v.isLatest}`)
  console.log(`  Size: ${v.size} bytes`)
  console.log(`  Modified: ${v.lastModified}`)
  console.log(`  Delete marker: ${v.isDeleteMarker}`)
})
```

---

#### `deleteVersion`

Permanently deletes a specific version of an object.

**WARNING:** This operation is irreversible. The version will be permanently removed.

**Use cases:**

- Removing a delete marker to "undelete" an object
- Permanently removing old versions to save space
- Compliance requirements (data retention policies)

**Input:**

```typescript
{
  project_id: string,
  bucket: string,
  key: string,
  versionId: string
}
```

**Output:**

```typescript
{
  success: boolean
}
```

**Example:**

```typescript
// Delete a specific version
await trpc.storage.ceph.versioning.deleteVersion.mutate({
  project_id: "abc123",
  bucket: "my-bucket",
  key: "documents/report.pdf",
  versionId: "version-123",
})

// Remove a delete marker to "undelete"
await trpc.storage.ceph.versioning.deleteVersion.mutate({
  project_id: "abc123",
  bucket: "my-bucket",
  key: "documents/deleted.pdf",
  versionId: "delete-marker-456",
})
```

---

#### `restoreVersion`

Restores a previous version by copying it to become the new latest version.

**How it works:**

1. Copies the old version to the same key
2. Creates a new latest version with the old version's content
3. All versions are preserved (including the old and new versions)

**Note:** S3 doesn't have a native "promote version" operation. This is the standard approach for version restoration.

**Input:**

```typescript
{
  project_id: string,
  bucket: string,
  key: string,
  versionId: string  // The version to restore
}
```

**Output:**

```typescript
{
  success: boolean
  versionId: string // The new version ID created by the restore
}
```

**Example:**

```typescript
// Restore an old version
const result = await trpc.storage.ceph.versioning.restoreVersion.mutate({
  project_id: "abc123",
  bucket: "my-bucket",
  key: "documents/report.pdf",
  versionId: "old-version-123",
})

console.log(`Restored! New version ID: ${result.versionId}`)
```

---

### Versioning Concepts

#### Delete Markers

When an object is deleted in a versioned bucket, S3 creates a **delete marker** (a special version) instead of permanently removing the object. This is a "soft delete."

- Delete markers have `isDeleteMarker: true` and `size: 0`
- The object appears deleted when listing objects
- All previous versions remain accessible
- To "undelete," delete the delete marker using `deleteVersion`

**Example: Soft Delete and Restore**

```typescript
// 1. Enable versioning
await trpc.storage.ceph.versioning.setStatus.mutate({
  project_id: "abc123",
  bucket: "my-bucket",
  status: "Enabled",
})

// 2. Upload an object (creates version v1)
// ...upload logic...

// 3. Delete the object (creates delete marker)
await trpc.storage.ceph.objects.delete.mutate({
  project_id: "abc123",
  containerName: "my-bucket",
  objectKey: "important-file.txt",
})

// 4. Object appears deleted in listings
const { objects } = await trpc.storage.ceph.objects.list.query({
  project_id: "abc123",
  containerName: "my-bucket",
})
// important-file.txt not in list

// 5. List versions shows delete marker
const versions = await trpc.storage.ceph.versioning.listObjectVersions.query({
  project_id: "abc123",
  bucket: "my-bucket",
  key: "important-file.txt",
})
// [{ versionId: "dm-123", isDeleteMarker: true, isLatest: true }, { versionId: "v1", isDeleteMarker: false, isLatest: false }]

// 6. Restore by deleting the delete marker
await trpc.storage.ceph.versioning.deleteVersion.mutate({
  project_id: "abc123",
  bucket: "my-bucket",
  key: "important-file.txt",
  versionId: "dm-123", // Delete marker version ID
})

// 7. Object reappears in listings
// important-file.txt is back!
```

#### Version Lifecycle

```
Unversioned Bucket:
  Upload object.txt     → object.txt (overwrites if exists)
  Delete object.txt     → object.txt gone forever

Versioned Bucket:
  Upload object.txt     → object.txt (version v1)
  Upload object.txt     → object.txt (version v2, v1 preserved)
  Upload object.txt     → object.txt (version v3, v1+v2 preserved)
  Delete object.txt     → Delete marker (v1+v2+v3 preserved)
  Delete delete marker  → object.txt back (version v3 is latest)
```

---

## Error Handling

### S3 Error Mapper

The `mapS3ErrorToTRPCError` helper maps AWS SDK S3 error codes to tRPC error codes with contextual messages.

#### Mapped Error Codes

| S3 Error Code             | tRPC Code             | Description                        |
| ------------------------- | --------------------- | ---------------------------------- |
| `NoSuchBucket`            | `NOT_FOUND`           | Bucket does not exist              |
| `NoSuchKey`               | `NOT_FOUND`           | Object does not exist              |
| `NoSuchUpload`            | `NOT_FOUND`           | Multipart upload ID not found      |
| `NoSuchVersion`           | `NOT_FOUND`           | Object version does not exist      |
| `BucketAlreadyExists`     | `CONFLICT`            | Bucket name already taken          |
| `BucketAlreadyOwnedByYou` | `CONFLICT`            | Bucket already owned by you        |
| `BucketNotEmpty`          | `PRECONDITION_FAILED` | Cannot delete non-empty bucket     |
| `InvalidBucketState`      | `BAD_REQUEST`         | Invalid bucket state for operation |
| `VersioningNotEnabled`    | `PRECONDITION_FAILED` | Versioning not enabled on bucket   |
| `AccessDenied`            | `FORBIDDEN`           | Insufficient permissions           |
| `AllAccessDisabled`       | `FORBIDDEN`           | All access disabled                |
| `InvalidAccessKeyId`      | `UNAUTHORIZED`        | Invalid access key                 |
| `SignatureDoesNotMatch`   | `UNAUTHORIZED`        | Invalid secret key                 |
| `TokenRefreshRequired`    | `UNAUTHORIZED`        | Token expired                      |
| `RequestTimeTooSkewed`    | `UNAUTHORIZED`        | Clock skew too large               |
| `InvalidBucketName`       | `BAD_REQUEST`         | Invalid bucket name format         |
| `KeyTooLongError`         | `BAD_REQUEST`         | Object key too long                |
| `EntityTooLarge`          | `PAYLOAD_TOO_LARGE`   | Object exceeds max size            |
| `EntityTooSmall`          | `BAD_REQUEST`         | Object below minimum size          |

Unmapped error codes are logged and returned as `INTERNAL_SERVER_ERROR`.

#### Error Context

All errors include contextual information:

```typescript
throw mapS3ErrorToTRPCError(error, {
  operation: "list objects",
  bucket: "my-bucket",
  key: "path/to/object", // optional
})
```

Produces messages like:

```
Failed to list objects — bucket: my-bucket — NoSuchBucket: The specified bucket does not exist
```

---

### Special Error: `NO_CEPH_CREDENTIALS`

When a user attempts a protected Ceph operation without EC2 credentials, the BFF returns:

```typescript
{
  code: "FORBIDDEN",
  message: "NO_CEPH_CREDENTIALS"
}
```

Frontend should catch this and prompt the user to:

1. Navigate to **Storage Settings** or **Credentials Management**
2. Create a new EC2 credential via `ec2Credentials.create`
3. Save the access key and secret key securely
4. Retry the operation

**Example client-side handling:**

```typescript
try {
  const containers = await trpc.storage.ceph.containers.list.query({ project_id })
} catch (error) {
  if (error.data?.code === "FORBIDDEN" && error.message === "NO_CEPH_CREDENTIALS") {
    // Redirect to credential creation flow
    router.push("/storage/credentials/create")
  }
}
```

---

## Configuration

### Environment Variables

None required. All configuration is resolved from the OpenStack service catalog:

- S3 endpoint: extracted from Ceph service endpoints
- Region: auto-constructed from OpenStack region identifier

### Service Catalog Endpoint Resolution

The BFF resolves the S3 endpoint from the OpenStack service catalog:

1. Query the `"ceph"` service via `ctx.openstack.service("ceph")`
2. Call `service.getEndpoint()` to get the base URL
3. If the URL contains `/swift/`, remove that suffix:
   - Swift: `https://rgw.example.com/swift/v1/AUTH_xxx`
   - S3: `https://rgw.example.com` (base URL)
4. Extract the region from the Ceph service endpoint (e.g., `qa-de-1`)
5. Construct the Ceph-compatible region identifier:
   - Standard: `ceph-objectstore-st1-{region}`
   - Exception: `qa-de-1` → `ceph-objectstore-ec-st1-qa-de-1`
6. Return the base URL and region identifier

**Important:** The Ceph service **must** be registered in the OpenStack service catalog. All configuration comes from the service catalog to ensure consistency across deployments.

---

## Usage Examples

### Complete Credential Setup Flow

```typescript
// 1. Check if credentials exist
const { hasCredentials } = await trpc.storage.ceph.containers.status.query({
  project_id: "abc123",
})

if (!hasCredentials) {
  // 2. Create credentials
  const credential = await trpc.storage.ceph.ec2Credentials.create.mutate({
    project_id: "abc123",
  })

  // 3. Display to user (ONLY chance to see the secret!)
  alert(`Save these credentials:
    Access Key: ${credential.access}
    Secret Key: ${credential.secret}`)
}

// 4. Now you can use Ceph S3 operations
const containers = await trpc.storage.ceph.containers.list.query({
  project_id: "abc123",
})
```

---

### Browsing a Bucket with Folder Hierarchy

```typescript
async function browseBucket(containerName: string, currentPath: string = "") {
  const { objects, folders } = await trpc.storage.ceph.objects.list.query({
    project_id: "abc123",
    containerName,
    prefix: currentPath,
    delimiter: "/",
  })

  console.log("Folders:")
  folders.forEach((f) => console.log(`  📁 ${f.prefix}`))

  console.log("Files:")
  objects.forEach((o) => {
    const sizeKB = (o.size / 1024).toFixed(2)
    console.log(`  📄 ${o.key} (${sizeKB} KB)`)
  })
}

// Usage
await browseBucket("my-bucket", "") // Root level
await browseBucket("my-bucket", "photos/") // Inside "photos/" folder
await browseBucket("my-bucket", "photos/2024/") // Nested folder
```

---

### Paginated Object Listing

```typescript
async function listAllObjects(containerName: string, prefix?: string) {
  let continuationToken: string | undefined = undefined
  const allObjects: S3Object[] = []

  do {
    const { objects, isTruncated, nextContinuationToken } = await trpc.storage.ceph.objects.list.query({
      project_id: "abc123",
      containerName,
      prefix,
      delimiter: undefined, // Flat list (no folders)
      continuationToken,
    })

    allObjects.push(...objects)
    continuationToken = nextContinuationToken

    console.log(`Fetched ${objects.length} objects...`)
  } while (continuationToken)

  console.log(`Total: ${allObjects.length} objects`)
  return allObjects
}
```

---

### Managing Multiple Credentials (Rotation)

```typescript
// List existing credentials
const credentials = await trpc.storage.ceph.ec2Credentials.list.query({
  project_id: "abc123",
})

console.log(`You have ${credentials.length} credential(s)`)

// Create a new one (for rotation)
const newCred = await trpc.storage.ceph.ec2Credentials.create.mutate({
  project_id: "abc123",
})

console.log("New credential created:", newCred.access)

// Test the new credential (update your app to use it)
// ...

// Delete the old credential
await trpc.storage.ceph.ec2Credentials.delete.mutate({
  project_id: "abc123",
  credentialId: credentials[0].id,
})

console.log("Old credential deleted")
```

---

## Security Considerations

### 1. Credential Storage

- **Secret keys are NEVER stored in the BFF** — they are only returned on creation
- Credentials are stored securely in OpenStack Keystone
- Clients must store the secret key securely (e.g., browser localStorage with encryption, or server-side key management)

### 2. Project Scoping

- All operations are scoped to the current Keystone project
- Users can only access credentials for projects they are authenticated to
- EC2 credential lookup filters by `project_id` to prevent cross-project access

### 3. Credential Lifecycle

- Credentials are tied to a **user + project** pair
- Deleting a user or project should cascade to delete their credentials (handled by Keystone)
- Implement **credential rotation** by creating new credentials, testing them, then deleting old ones

### 4. S3 Access Control

- Ceph RGW bucket/object ACLs are independent of Keystone
- EC2 credentials provide S3-level authentication (AWS Signature v4)
- For multi-tenant isolation, use separate buckets per project or use Ceph's bucket policies

### 5. Endpoint Security

- Always use HTTPS for `CEPH_S3_ENDPOINT`
- Validate TLS certificates in production environments
- Never expose the BFF endpoints publicly without authentication middleware

---

## Performance Considerations

### 1. Credential Resolution

- Credentials are resolved **on every tRPC request** via the `cephCredentialMiddleware`
- The OpenStack Identity API is called to fetch credentials
- **Recommendation:** Consider caching resolved credentials in the session or Redis with a short TTL (e.g., 5 minutes)

### 2. S3 Client Pooling

- Currently, a new `S3Client` is created per request via `getCephClient()`
- **Recommendation:** Implement client pooling or memoization based on `(access, endpoint)` tuple

### 3. Large Listings

- Use `maxKeys` and `continuationToken` for pagination
- Avoid fetching all objects at once for buckets with thousands of objects
- Consider server-side filtering with `prefix` to reduce payload size

### 4. Object Operations

- For uploads/downloads, consider using **presigned URLs** (not yet implemented) to allow direct client → Ceph transfers without proxying through the BFF
- For very large files, use multipart uploads (not yet implemented)

---

## Comparison: Ceph S3 vs. Swift

| Feature              | Ceph S3 (this BFF)                        | Swift BFF                              |
| -------------------- | ----------------------------------------- | -------------------------------------- |
| **Authentication**   | EC2 credentials (access + secret)         | Keystone token                         |
| **API Style**        | S3-compatible (AWS SDK)                   | OpenStack Swift API                    |
| **Bucket/Container** | S3 buckets                                | Swift containers                       |
| **Object Hierarchy** | `delimiter` + `prefix`                    | `delimiter` + `prefix`                 |
| **Metadata**         | User metadata via `x-amz-meta-`           | Custom headers via `X-Object-Meta-`    |
| **Large Objects**    | Multipart uploads                         | Static/Dynamic Large Objects (SLO/DLO) |
| **Uploads**          | `octetInputParser` streaming (+ progress) | `octetInputParser` streaming           |
| **Downloads**        | Async iterable base64 chunks (+ progress) | Async iterable base64 chunks           |
| **Temporary URLs**   | Presigned URLs (not yet impl)             | HMAC-SHA256 signed temp URLs           |

**When to use which?**

- **Swift BFF:** When using OpenStack Swift directly, need Keystone token auth, or require Swift-specific features (SLO, versioning, bulk delete)
- **Ceph S3 BFF:** When using Ceph RGW with S3 API, need S3-compatible tooling, or prefer AWS SDK ecosystem

Both can coexist — Ceph RGW supports **both Swift and S3 APIs** on the same cluster.

---

## Current Limitations & Future Enhancements

### Not Yet Implemented

1. **Bucket Management**
   - ~~Create bucket (`CreateBucketCommand`)~~ ✅ Implemented
   - ~~Delete bucket (`DeleteBucketCommand`)~~ ✅ Implemented
   - ~~Empty bucket (bulk delete all objects)~~ ✅ Implemented
   - Configure bucket policies, CORS, lifecycle rules

2. **Object Upload/Download**
   - ~~Upload object (`PutObjectCommand`)~~ ✅ Implemented — streamed through the BFF via `octetInputParser`, with a `watchUploadProgress` subscription for progress
   - ~~Download object (`GetObjectCommand`)~~ ✅ Implemented — streamed through the BFF as a tRPC async iterable, with a `watchDownloadProgress` subscription for progress
   - ~~Streaming upload via tRPC (similar to Swift BFF `uploadObject`)~~ ✅ Implemented
   - Multipart uploads for large files

3. **Object Manipulation**
   - ~~Delete object (`DeleteObjectCommand`)~~ ✅ Implemented
   - ~~Copy object (`CopyObjectCommand`)~~ ✅ Implemented
   - ~~Move object (Copy + Delete)~~ ✅ Implemented
   - ~~Update object metadata~~ ✅ Implemented
   - ~~Create folder (zero-byte object with trailing `/`)~~ ✅ Implemented
   - Bulk delete operations

4. **Presigned URLs**
   - Generate time-limited signed URLs for direct client access
   - Use `@aws-sdk/s3-request-presigner`

5. **Advanced Features**
   - ~~Bucket versioning~~ ✅ Implemented
   - Object locking
   - Server-side encryption (SSE-S3, SSE-C)
   - Object tagging
   - Access logging

### Known Issues

- **No credential caching:** Credentials are fetched from Keystone on every request
- **No S3 client pooling:** A new client is instantiated per request
- **No multipart upload support:** uploads stream through a single `PutObjectCommand`; very large files may time out
- **No presigned URL generation:** All operations must go through the BFF
- **No bulk delete support:** Objects must be deleted one at a time (can be slow for large folders)

---

## Testing

### Unit Tests

```bash
pnpm test apps/aurora-portal/src/server/Storage/routers/ec2CredentialRouter.test.ts
pnpm test apps/aurora-portal/src/server/Storage/routers/containerRouter.test.ts
pnpm test apps/aurora-portal/src/server/Storage/routers/objectRouter.test.ts
pnpm test apps/aurora-portal/src/server/Storage/cephProcedure.test.ts
```

Object upload is covered across `objectRouter.test.ts` (`uploadObject` / `watchUploadProgress`), `cephProcedure.test.ts` (`cephUploadProcedure` header rescoping), and the frontend `UploadObjectModal.test.tsx` / `ObjectBrowserView.test.tsx` / `ObjectToastNotifications.test.tsx`.

### Integration Testing

1. **Ensure Ceph service is registered in OpenStack catalog:**

   ```bash
   openstack service list | grep ceph
   openstack endpoint list --service ceph
   ```

   If not registered:

   ```bash
   openstack service create --name ceph --description "Ceph RGW" object-store
   openstack endpoint create --region RegionOne ceph public https://rgw.example.com
   ```

2. **Create credentials via tRPC:**

   ```typescript
   const credential = await trpc.storage.ceph.ec2Credentials.create.mutate({
     project_id: "your-project-id",
   })
   console.log("Access:", credential.access)
   console.log("Secret:", credential.secret)
   ```

3. **Test bucket operations:**

   ```typescript
   const { hasCredentials } = await trpc.storage.ceph.containers.status.query({
     project_id: "your-project-id",
   })
   console.assert(hasCredentials === true)

   const containers = await trpc.storage.ceph.containers.list.query({
     project_id: "your-project-id",
   })
   console.log("Buckets:", containers)
   ```

4. **Test object listing:**
   ```typescript
   const { objects, folders } = await trpc.storage.ceph.objects.list.query({
     project_id: "your-project-id",
     containerName: "test-bucket",
   })
   console.log("Objects:", objects.length)
   console.log("Folders:", folders.length)
   ```

---

## Integration into Aurora Portal

### 1. Add to tRPC Router

The router is already integrated at `/apps/aurora-portal/src/server/Storage/routers/index.ts`:

```typescript
export const objectStorageRouters = {
  storage: {
    swift: auroraRouter({ ...swiftRouter }),
    ceph: auroraRouter({
      ec2Credentials: auroraRouter({ ...ec2CredentialRouter }),
      containers: auroraRouter({ ...containerRouter }),
      objects: auroraRouter({ ...objectRouter }),
    }),
  },
}
```

### 2. Import Types

```typescript
import type {
  Ec2Credential,
  Ec2CredentialWithSecret,
  Container,
  S3Object,
  S3ObjectDetails,
} from "@/server/Storage/types/ceph"
```

### 3. Use in Frontend Components

```typescript
import { trpc } from "@/utils/trpc"

function CephStoragePage() {
  const { data: status } = trpc.storage.ceph.containers.status.useQuery({
    project_id: currentProject.id,
  })

  const { data: containers } = trpc.storage.ceph.containers.list.useQuery(
    { project_id: currentProject.id },
    { enabled: status?.hasCredentials }
  )

  if (!status?.hasCredentials) {
    return <CredentialSetupPrompt />
  }

  return <BucketList containers={containers ?? []} />
}
```

---

## Troubleshooting

### Problem: `FORBIDDEN` error with message `NO_CEPH_CREDENTIALS`

**Cause:** User has not created EC2 credentials for the current project.

**Solution:**

1. Call `storage.ceph.ec2Credentials.create`
2. Display the access key and secret key to the user
3. Instruct them to save it securely
4. Retry the operation

---

### Problem: `UNAUTHORIZED` error with `InvalidAccessKeyId` or `SignatureDoesNotMatch`

**Cause:** Invalid or expired EC2 credentials.

**Solution:**

1. Delete the invalid credential via `storage.ceph.ec2Credentials.delete`
2. Create a new credential via `storage.ceph.ec2Credentials.create`
3. Update the stored credentials in your app

---

### Problem: `NOT_FOUND` error with `NoSuchBucket`

**Cause:** The specified bucket does not exist or the user lacks permissions.

**Solution:**

1. Verify the bucket name is correct
2. Check if the user's EC2 credentials have access to the bucket
3. If using Ceph bucket policies, verify the policy grants access

---

### Problem: `Ceph service not found in catalog` or `Ceph service endpoint not found in catalog`

**Cause:** The `"ceph"` service is not registered in the OpenStack service catalog, or the endpoint is missing.

**Solution:**

Register the Ceph service in the catalog:

```bash
openstack service create --name ceph --description "Ceph RGW" object-store
openstack endpoint create --region RegionOne ceph public https://rgw.example.com
```

Verify registration:

```bash
openstack service list | grep ceph
openstack endpoint list --service ceph
```

**Note:** Environment variable fallbacks (e.g., `CEPH_S3_ENDPOINT`) are not supported. All configuration must come from the service catalog.

---

### Problem: `All input parsers did not resolve to an object` when wiring an upload

**Cause:** `octetInputParser` was chained onto `cephProtectedProcedure` (or another `projectScopedProcedure`-based procedure). tRPC can't merge the raw-stream input with the `project_id` object input those procedures bundle.

**Solution:**

Use `cephUploadProcedure` instead — it's built on the base `protectedProcedure` and rescopes from the `x-upload-project-id` header rather than a tRPC input. Send the project id (and other metadata) as `x-upload-*` request headers, not as a JSON input. See [`uploadObject`](#uploadobject) and [Middleware Layers](#3-middleware-layers).

---

## References

- [AWS SDK for JavaScript v3 - S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [Ceph RADOS Gateway (RGW) S3 API](https://docs.ceph.com/en/latest/radosgw/s3/)
- [OpenStack Keystone EC2 Credentials](https://docs.openstack.org/keystone/latest/api/v3/index.html#credentials)
- [AWS Signature Version 4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)
- [tRPC Documentation](https://trpc.io/)

---

## Next Steps

1. **Implement object upload** — streaming via `octetInputParser` (download already implemented via async-iterable streaming with progress tracking)
2. **Add presigned URL generation** — allow direct client → Ceph transfers for large files
3. ~~**Implement bucket management**~~ ✅ Completed — create, delete, empty buckets
4. **Add credential caching** — reduce Keystone API calls
5. **Implement multipart uploads** — for large files (>100 MB)
6. ~~**Add object manipulation**~~ ✅ Completed — delete, copy, move, update metadata, create folders
7. **Add bucket policies** — manage access control at bucket level
8. **Implement server-side encryption** — SSE-S3, SSE-C
9. **Add object tagging** — for metadata and lifecycle management
10. **Add access logging** — track S3 API usage
11. **Implement bulk delete operations** — for efficient multi-object deletion
