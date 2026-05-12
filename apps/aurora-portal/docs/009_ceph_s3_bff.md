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
apps/aurora-portal/src/server/Storage/
├── cephProcedure.ts              # Base procedures & middleware
├── middleware/
│   └── resolveEC2Credential.ts   # Credential resolution logic
├── clients/
│   └── s3Client.ts               # S3Client factory
├── routers/
│   ├── index.ts                  # Router exports
│   ├── ec2CredentialRouter.ts    # Credential CRUD operations
│   ├── containerRouter.ts        # Bucket operations
│   └── objectRouter.ts           # Object operations
├── helpers/
│   └── s3ErrorMapper.ts          # S3 → tRPC error mapping
└── types/
    └── ceph.ts                   # Zod schemas & TypeScript types
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
   - **Primary:** Extract from Ceph service catalog (removes `/swift/v1/...` suffix)
   - **Fallback:** `CEPH_S3_ENDPOINT` environment variable
3. Resolves the region: `CEPH_REGION` env var or `"default"`
4. Returns a configured AWS SDK v3 `S3Client` with:
   - `forcePathStyle: true` (required for Ceph RGW — it does not support virtual-hosted-style URLs)
   - Static credentials (access key ID + secret access key)

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
  │   └── getDetails()  → ContainerDetails
  └── objects
      ├── list()        → { objects, folders, isTruncated, nextContinuationToken }
      └── getDetails()  → S3ObjectDetails
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

## Error Handling

### S3 Error Mapper

The `mapS3ErrorToTRPCError` helper maps AWS SDK S3 error codes to tRPC error codes with contextual messages.

#### Mapped Error Codes

| S3 Error Code             | tRPC Code             | Description                    |
| ------------------------- | --------------------- | ------------------------------ |
| `NoSuchBucket`            | `NOT_FOUND`           | Bucket does not exist          |
| `NoSuchKey`               | `NOT_FOUND`           | Object does not exist          |
| `NoSuchUpload`            | `NOT_FOUND`           | Multipart upload ID not found  |
| `BucketAlreadyExists`     | `CONFLICT`            | Bucket name already taken      |
| `BucketAlreadyOwnedByYou` | `CONFLICT`            | Bucket already owned by you    |
| `BucketNotEmpty`          | `PRECONDITION_FAILED` | Cannot delete non-empty bucket |
| `AccessDenied`            | `FORBIDDEN`           | Insufficient permissions       |
| `AllAccessDisabled`       | `FORBIDDEN`           | All access disabled            |
| `InvalidAccessKeyId`      | `UNAUTHORIZED`        | Invalid access key             |
| `SignatureDoesNotMatch`   | `UNAUTHORIZED`        | Invalid secret key             |
| `TokenRefreshRequired`    | `UNAUTHORIZED`        | Token expired                  |
| `RequestTimeTooSkewed`    | `UNAUTHORIZED`        | Clock skew too large           |
| `InvalidBucketName`       | `BAD_REQUEST`         | Invalid bucket name format     |
| `KeyTooLongError`         | `BAD_REQUEST`         | Object key too long            |
| `EntityTooLarge`          | `PAYLOAD_TOO_LARGE`   | Object exceeds max size        |
| `EntityTooSmall`          | `BAD_REQUEST`         | Object below minimum size      |

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

#### Required

- **`CEPH_S3_ENDPOINT`** (or service catalog)
  - Base URL for Ceph RGW S3 API
  - Example: `https://rgw.st1.qa-de-1.cloud.sap`
  - Can be omitted if Ceph service is registered in the OpenStack service catalog

#### Optional

- **`CEPH_REGION`**
  - S3 region name (default: `"default"`)
  - Used for AWS SDK signature calculation

### Service Catalog Endpoint Resolution

The BFF attempts to resolve the S3 endpoint from the OpenStack service catalog:

1. Query the `"ceph"` service via `ctx.openstack.service("ceph")`
2. Call `service.getEndpoint()` to get the base URL
3. If the URL contains `/swift/`, remove that suffix:
   - Swift: `https://rgw.example.com/swift/v1/AUTH_xxx`
   - S3: `https://rgw.example.com` (base URL)
4. Return the base URL

**Fallback:** If the Ceph service is not in the catalog, fall back to `CEPH_S3_ENDPOINT` env var.

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

| Feature              | Ceph S3 (this BFF)                | Swift BFF                              |
| -------------------- | --------------------------------- | -------------------------------------- |
| **Authentication**   | EC2 credentials (access + secret) | Keystone token                         |
| **API Style**        | S3-compatible (AWS SDK)           | OpenStack Swift API                    |
| **Bucket/Container** | S3 buckets                        | Swift containers                       |
| **Object Hierarchy** | `delimiter` + `prefix`            | `delimiter` + `prefix`                 |
| **Metadata**         | User metadata via `x-amz-meta-`   | Custom headers via `X-Object-Meta-`    |
| **Large Objects**    | Multipart uploads                 | Static/Dynamic Large Objects (SLO/DLO) |
| **Uploads**          | (Not yet implemented)             | `octetInputParser` streaming           |
| **Downloads**        | (Not yet implemented)             | Async iterable base64 chunks           |
| **Temporary URLs**   | Presigned URLs (not yet impl)     | HMAC-SHA256 signed temp URLs           |

**When to use which?**

- **Swift BFF:** When using OpenStack Swift directly, need Keystone token auth, or require Swift-specific features (SLO, versioning, bulk delete)
- **Ceph S3 BFF:** When using Ceph RGW with S3 API, need S3-compatible tooling, or prefer AWS SDK ecosystem

Both can coexist — Ceph RGW supports **both Swift and S3 APIs** on the same cluster.

---

## Current Limitations & Future Enhancements

### Not Yet Implemented

1. **Bucket Management**
   - Create bucket (`CreateBucketCommand`)
   - Delete bucket (`DeleteBucketCommand`)
   - Configure bucket policies, CORS, lifecycle rules

2. **Object Upload/Download**
   - Upload object (`PutObjectCommand`)
   - Download object (`GetObjectCommand`)
   - Streaming upload/download via tRPC (similar to Swift BFF `uploadObject`/`downloadObject`)
   - Multipart uploads for large files

3. **Object Manipulation**
   - Delete object (`DeleteObjectCommand`)
   - Copy object (`CopyObjectCommand`)
   - Update object metadata
   - Bulk delete operations

4. **Presigned URLs**
   - Generate time-limited signed URLs for direct client access
   - Use `@aws-sdk/s3-request-presigner`

5. **Advanced Features**
   - Bucket versioning
   - Object locking
   - Server-side encryption (SSE-S3, SSE-C)
   - Object tagging
   - Access logging

### Known Issues

- **No credential caching:** Credentials are fetched from Keystone on every request
- **No S3 client pooling:** A new client is instantiated per request
- **No multipart upload support:** Large file uploads may timeout
- **No presigned URL generation:** All operations must go through the BFF

---

## Testing

### Unit Tests

```bash
pnpm test apps/aurora-portal/src/server/Storage/routers/ec2CredentialRouter.test.ts
pnpm test apps/aurora-portal/src/server/Storage/routers/containerRouter.test.ts
pnpm test apps/aurora-portal/src/server/Storage/routers/objectRouter.test.ts
```

### Integration Testing

1. **Set up environment:**

   ```bash
   export CEPH_S3_ENDPOINT="https://rgw.example.com"
   export CEPH_REGION="default"
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

### Problem: `Failed to resolve Ceph service from catalog`

**Cause:** The `"ceph"` service is not registered in the OpenStack service catalog.

**Solution:**

1. Set `CEPH_S3_ENDPOINT` environment variable explicitly
2. Or register the Ceph service in the catalog:
   ```bash
   openstack service create --name ceph --description "Ceph RGW" object-store
   openstack endpoint create --region RegionOne ceph public https://rgw.example.com
   ```

---

### Problem: `S3 endpoint is not configured`

**Cause:** Neither `CEPH_S3_ENDPOINT` env var nor service catalog endpoint is available.

**Solution:**

Set the environment variable:

```bash
export CEPH_S3_ENDPOINT="https://rgw.st1.qa-de-1.cloud.sap"
```

---

## References

- [AWS SDK for JavaScript v3 - S3 Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [Ceph RADOS Gateway (RGW) S3 API](https://docs.ceph.com/en/latest/radosgw/s3/)
- [OpenStack Keystone EC2 Credentials](https://docs.openstack.org/keystone/latest/api/v3/index.html#credentials)
- [AWS Signature Version 4](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)
- [tRPC Documentation](https://trpc.io/)

---

## Next Steps

1. **Implement object upload/download** — streaming via `octetInputParser` / async iterables (similar to Swift BFF)
2. **Add presigned URL generation** — allow direct client → Ceph transfers for large files
3. **Implement bucket management** — create, delete, configure buckets
4. **Add credential caching** — reduce Keystone API calls
5. **Implement multipart uploads** — for large files (>100 MB)
6. **Add object manipulation** — delete, copy, update metadata
7. **Add bucket policies** — manage access control at bucket level
8. **Implement server-side encryption** — SSE-S3, SSE-C
9. **Add object tagging** — for metadata and lifecycle management
10. **Add access logging** — track S3 API usage
