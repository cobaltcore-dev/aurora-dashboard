# OpenStack Swift Object Storage - BFF Implementation

This implementation provides a complete Backend for Frontend (BFF) layer for OpenStack Swift Object Storage API, **100% aligned with the official OpenStack Swift API documentation**.

## ✅ Verification Status

This implementation has been verified against the official OpenStack Swift API documentation at:

- https://docs.openstack.org/api-ref/object-store/

All endpoints, parameters, headers, and response codes match the official specification.

## 📌 Important Note on API Versioning

The OpenStack Swift service client automatically handles API versioning. When you call `openstackSession.service("swift")`, the SDK returns a client configured with the correct endpoint including the API version (e.g., `/v1/AUTH_account`).

Therefore, the router uses **relative paths** without explicit version prefixes:

```typescript
// Account operations
swift.get("?format=json") // → /v1/AUTH_account?format=json

// Container operations
swift.get("container") // → /v1/AUTH_account/container

// Object operations
swift.get("container/object") // → /v1/AUTH_account/container/object

// Service info (special case: no version, no auth required)
swift.get("/info") // → /info
```

**The SDK handles:**

- ✅ Authentication and token management
- ✅ Service discovery and endpoint resolution
- ✅ API versioning (`/v1/`)
- ✅ Account ID prefix (`AUTH_account`)

**The router handles:**

- ✅ Business logic and data transformation
- ✅ Input validation with Zod schemas
- ✅ Error handling and mapping
- ✅ Type safety with TypeScript

## Files Created

### 1. `swift.ts` - Zod Schemas

Comprehensive Zod schemas for type-safe validation of:

- **Service operations**: Service info and capabilities
- **Account operations**: List containers, manage account metadata
- **Container operations**: Create/list/update/delete containers, manage container metadata
- **Object operations**: Download/copy/delete objects, manage object metadata
- **Bulk operations**: Bulk delete for multiple objects
- **Folder operations**: Create, list, move, and delete pseudo-folders
- **Download**: Stream object content via BFF as base64 chunks using an async iterable procedure
- **Temporary URLs**: Generate time-limited signed URLs

### 2. `swiftHelpers.ts` - Helper Functions

Utility functions including:

- Service validation (`validateSwiftService`)
- Query parameter builders (`applyContainerQueryParams`, `applyObjectQueryParams`)
- Header parsers (`parseAccountInfo`, `parseContainerInfo`, `parseObjectMetadata`)
- Header builders (`buildAccountMetadataHeaders`, `buildContainerMetadataHeaders`, `buildObjectMetadataHeaders`)
- Error handling (`mapErrorResponseToTRPCError`, `handleZodParsingError`, `wrapError`, `withErrorHandling`)
- **Upload validation** (`validateSwiftUploadInput`) — validates upload inputs: container, object path, fileSize, and file stream (converted from the `octetInputParser` `ReadableStream` via `Readable.fromWeb()`)
- **Folder helpers** (`parseBreadcrumb`, `normalizeFolderPath`, `isFolderMarker`, `extractFolders`)
- **Temporary URL helpers** (`generateTempUrlSignature`, `constructTempUrl`)

### 3. `swiftRouter.ts` - tRPC Router

Complete tRPC router with procedures for:

#### Service Operations

- `getServiceInfo` - Get Swift service capabilities and configuration from `/info` endpoint

#### Account Operations

- `listContainers` - List containers in an account
- `getAccountMetadata` - Get account metadata and statistics
- `updateAccountMetadata` - Update account metadata
- `deleteAccount` - Delete an account (requires admin privileges)

#### Container Operations

- `listObjects` - List objects in a container
- `createContainer` - Create a new container
- `getContainerMetadata` - Get container metadata
- `updateContainerMetadata` - Update container metadata
- `getContainerPublicUrl` - Get the public URL for a container derived from the service catalog public endpoint
- `deleteContainer` - Delete an empty container
- `emptyContainer` - Delete all objects in a container, returning the total number deleted

#### Object Operations

- `getObjectMetadata` - Get object metadata without downloading content (HEAD)
- `updateObjectMetadata` - Update object metadata without re-uploading content (POST)
- `copyObject` - Copy an object to a new location using PUT with `X-Copy-From`
- `deleteObject` - Delete an object; supports `?multipart-manifest=delete` for SLO cleanup

#### Bulk Operations

- `bulkDelete` - Delete up to 10,000 objects in a single request (requires `bulk_delete` middleware)

#### Folder Operations

- `createFolder` - Create a pseudo-folder with a zero-byte marker object (`Content-Type: application/directory`)
- `listFolderContents` - List folders and objects at the current level with hierarchy
- `moveFolder` - Move a folder by copying all objects then deleting originals
- `deleteFolder` - Delete a folder recursively or at the current level only

#### Temporary URL Operations

- `generateTempUrl` - Generate a time-limited HMAC-SHA256 signed URL; looks up the temp URL key from the container first, falls back to the account level

#### Upload Operations

- `uploadObject` - Upload a file via `octetInputParser` (raw `application/octet-stream` body); metadata sent as custom request headers (`x-upload-container`, `x-upload-object`, `x-upload-type`, `x-upload-size`, `x-upload-id`, `x-upload-account`); streams through a Node.js `Transform` pipe to Swift without buffering; emits per-chunk progress events via a module-level `EventEmitter`; returns `{ success }`
- `watchUploadProgress` - tRPC subscription yielding `{ uploaded, total, percent }` in real time for a given `uploadId`; the `uploadId` is computed client-side as `"<container>:<objectPath>:<uuid>"` and passed as a header before the upload starts so the subscription is active from the first byte; the BFF scopes it with the Keystone project ID to prevent cross-tenant observation; also yields an immediate snapshot if the upload is already in progress when the subscription opens; terminates on upload completion or error

#### Download Operations

- `downloadObject` - Stream object content to the client as base64 chunks via an async iterable mutation; requires `downloadId` input (computed client-side as `"<container>:<objectPath>:<uuid>"`; the BFF scopes it with the Keystone project ID to prevent cross-tenant observation); `contentType` and `filename` are included only in the first chunk; each chunk carries `downloaded` and `total` byte counts; server never buffers the full file in memory

## Key Features

### 1. Type Safety

All inputs and outputs are validated using Zod schemas, ensuring type safety throughout the application.

### 2. Comprehensive Error Handling

- Proper HTTP status code mapping to tRPC error codes
- Context-aware error messages
- Validation error handling with detailed feedback

### 3. Metadata Support

Full support for:

- Account metadata (custom key-value pairs)
- Container metadata (custom key-value pairs, ACLs, versioning)
- Object metadata (custom key-value pairs, content headers)

### 4. Advanced Features

- **Service Discovery**: Query Swift capabilities via `/info` endpoint
- **Pseudo-Folders**: Create and manage hierarchical folder structures
- **Streaming Upload**: Upload files via `octetInputParser` (raw binary body) with metadata in custom headers; real-time byte-level progress via a tRPC subscription keyed by a client-computed `uploadId`
- **Download**: Stream object content via BFF as base64 chunks using an async iterable procedure
- **Temporary URLs**: Generate time-limited signed URLs with HMAC-SHA256
- **Pagination**: Marker-based pagination for large listings
- **Filtering**: Prefix, delimiter, and range-based filtering
- **Large Objects**: Support for static and dynamic large objects
- **Symlinks**: Support for symlink objects
- **ACLs**: Container-level access control lists
- **Versioning**: Container versioning support
- **Quotas**: Account and container quota support

### 5. Binary Data Handling

- **Upload (`uploadObject`)**: Uses tRPC's `octetInputParser` — the file is sent as a raw `application/octet-stream` body, giving the BFF a true `ReadableStream` without buffering. Metadata (`container`, `object`, `contentType`, `fileSize`, `uploadId`) is passed as custom `x-upload-*` request headers read from `ctx.req.headers`. The stream is piped through a Node.js `Transform` that counts bytes per chunk, then converted to a Web `ReadableStream` via `Readable.toWeb()` and PUT to Swift. The BFF never holds the full file in memory. Per-chunk progress is emitted via a module-level `EventEmitter` keyed by `"${projectId}:${uploadId}"` — the BFF prepends the Keystone project ID to the client-provided `uploadId` to prevent cross-tenant progress observation.
- **Download (`downloadObject`)**: Swift's response body is read chunk by chunk via a `ReadableStream` reader. Each chunk is base64-encoded (required because tRPC SSE transport is JSON-only) and yielded with cumulative `downloaded` and `total` byte counts. `contentType` and `filename` are included only in the first chunk. The server never buffers the full file; the client currently assembles a `Blob` in memory before saving.

## Usage Examples

### List Containers

```typescript
const containers = await trpc.storage.swift.listContainers.query({
  limit: 100,
  prefix: "backup-",
  format: "json",
})
```

### Create Container with Metadata

```typescript
await trpc.storage.swift.createContainer.mutate({
  container: "my-container",
  metadata: {
    project: "demo",
    owner: "john",
  },
  read: ".r:*", // Public read access
  quotaBytes: 10737418240, // 10 GB quota
})
```

### Upload Object

```typescript
// uploadId format: "<container>:<objectPath>:<uuid>"
// The UUID suffix prevents collisions when the same object is uploaded concurrently.
// Compute it client-side so the subscription can be opened before the mutation.
const container = "my-container"
const objectPath = "folder/document.pdf" // full path including any prefix
const uploadId = `${container}:${objectPath}:${crypto.randomUUID()}`

// 1. Subscribe to progress first (vanilla tRPC client — useMutation can't consume subscriptions)
const progressSub = trpcClient.storage.swift.watchUploadProgress.subscribe(
  { uploadId },
  {
    onData({ uploaded, total, percent }) {
      console.log(`Upload progress: ${percent}% (${uploaded}/${total} bytes)`)
    },
  }
)

// 2. Upload raw file body with metadata in request headers
const { success } = await trpcClient.storage.swift.uploadObject.mutate(file, {
  context: {
    headers: {
      "x-upload-container": container,
      "x-upload-object": objectPath,
      "x-upload-type": file.type || "application/octet-stream",
      "x-upload-size": String(file.size),
      "x-upload-id": uploadId,
    },
  },
})
progressSub.unsubscribe()
console.log("Upload complete:", success)
```

> **Note:** `uploadId` follows the format `"<container>:<objectPath>:<uuid>"` — computable client-side before the mutation resolves, so the subscription can be opened first. The UUID suffix prevents collisions between concurrent uploads of the same object. On the BFF, the ID is further namespaced with the Keystone project ID (`"${projectId}:${uploadId}"`) so subscribers can only observe their own project's transfers. The progress subscription can be consumed either via `trpcReact.storage.swift.watchUploadProgress.useSubscription()` in React components, or via the vanilla `trpcClient` `.subscribe()` call outside of React.
>
> `Content-Length` is set from the `x-upload-size` header. If omitted or zero, the header is not sent and `percent` will always be `0` in progress events (bytes still accumulate in `uploaded`).

### Download Object

```typescript
const chunks: Uint8Array[] = []
let contentType = "application/octet-stream"
let filename = "download"

// downloadObject is an async generator — the BFF streams chunks from Swift
// without buffering the full file in memory. Content-type and filename are
// sent only in the first chunk.
const iterable = await trpcClient.storage.swift.downloadObject.mutate({
  container: "my-container",
  object: "report.pdf",
  filename: "Q4_Report.pdf",
})

for await (const { chunk, contentType: ct, filename: fn, downloaded, total } of iterable) {
  if (ct) contentType = ct
  if (fn) filename = fn
  chunks.push(Uint8Array.from(atob(chunk), (c) => c.charCodeAt(0)))
  // `total` is 0 when Swift does not send a Content-Length header
  if (total > 0) {
    const percent = Math.round((downloaded / total) * 100)
    console.log(`Download progress: ${percent}%`)
  }
}

// Concatenate chunks and trigger browser save dialog
const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
const merged = new Uint8Array(totalLength)
let offset = 0
for (const c of chunks) {
  merged.set(c, offset)
  offset += c.length
}

const blob = new Blob([merged], { type: contentType })
const url = URL.createObjectURL(blob)
const anchor = document.createElement("a")
anchor.href = url
anchor.download = filename
anchor.click()
URL.revokeObjectURL(url)
```

> **Note:** Uses `trpcClient` (vanilla) not `trpcReact`, because `useMutation`
> cannot consume async iterables. For very large files where client-side Blob
> assembly is a concern, use `generateTempUrl` instead — it produces a
> short-lived signed URL the browser can download directly.

### Copy Object

```typescript
await trpc.storage.swift.copyObject.mutate({
  container: "source-container",
  object: "file.txt",
  destination: "/destination-container/file-copy.txt",
  metadata: {
    copied: "true",
  },
})
```

**Note**: The `copyObject` operation uses PUT with `X-Copy-From` header, which is the officially recommended approach and is equivalent to using the COPY HTTP method. This ensures maximum compatibility with HTTP client libraries.

### Bulk Delete

```typescript
const result = await trpc.storage.swift.bulkDelete.mutate({
  objects: ["/container1/object1.txt", "/container1/object2.txt", "/container2/object3.txt"],
})

console.log(`Deleted: ${result.numberDeleted}`)
console.log(`Not found: ${result.numberNotFound}`)
console.log(`Errors:`, result.errors)
```

### Get Container Public URL

```typescript
const publicUrl = await trpc.storage.swift.getContainerPublicUrl.query({
  container: "my-container",
})

if (publicUrl) {
  console.log("Public URL:", publicUrl) // e.g. https://swift.example.com/v1/AUTH_xxx/my-container/
}
```

The URL is derived from the `public` interface endpoint in the service catalog. Returns `null` if no public endpoint is available.

### Empty Container

```typescript
const deletedCount = await trpc.storage.swift.emptyContainer.mutate({
  container: "my-container",
})

console.log(`Deleted ${deletedCount} objects`)
```

The endpoint automatically detects whether the `bulk_delete` middleware is enabled
by querying `/info` at runtime. If available, bulk delete is used for efficiency
(one request per page). Otherwise, objects are deleted individually. Either way,
large containers are handled transparently via marker-based pagination.

### Get Service Info

```typescript
const info = await trpc.storage.swift.getServiceInfo.query()

console.log("Max file size:", info.swift.max_file_size)
console.log("Max bulk deletes:", info.swift.bulk_delete?.max_deletes_per_request)
console.log("Policies:", info.swift.policies)
console.log("Container listing limit:", info.swift.container_listing_limit)
```

### Folder Management

```typescript
// Create folder
await trpc.storage.swift.createFolder.mutate({
  container: "documents",
  folderPath: "projects/2024/",
  metadata: {
    created_by: "user123",
  },
})

// List folder contents
const { folders, objects } = await trpc.storage.swift.listFolderContents.query({
  container: "documents",
  folderPath: "projects/",
})

console.log("Subfolders:", folders) // [{ name: "2024", path: "projects/2024/" }]
console.log("Files:", objects) // Array of ObjectSummary

// Move folder
const movedCount = await trpc.storage.swift.moveFolder.mutate({
  container: "documents",
  sourcePath: "projects/2024/",
  destinationPath: "archive/2024/",
})

console.log(`Moved ${movedCount} objects`)

// Delete folder recursively
const deletedCount = await trpc.storage.swift.deleteFolder.mutate({
  container: "documents",
  folderPath: "temp/",
  recursive: true,
})

console.log(`Deleted ${deletedCount} objects`)
```

### Generate Temporary URL

```typescript
const tempUrl = await trpc.storage.swift.generateTempUrl.mutate({
  container: "documents",
  object: "report.pdf",
  method: "GET",
  expiresIn: 3600, // 1 hour
  filename: "Q4_Report.pdf", // Optional: force download with specific name
})

console.log("Temporary URL:", tempUrl.url)
console.log("Expires at:", new Date(tempUrl.expiresAt * 1000))

// Share this URL - it's valid for 1 hour without authentication
```

## API Hierarchy

OpenStack Swift uses a hierarchical structure:

```
Account (Project/Tenant)
├── Container 1
│   ├── Object 1
│   ├── Object 2
│   └── Object 3
├── Container 2
│   └── Object 4
└── Container 3
```

## Integration

### 1. Add to your tRPC router

```typescript
import { swiftRouter } from "./routes/swiftRouter"

export const appRouter = createTRPCRouter({
  // ... existing routers
  storage: {
    swift: createTRPCRouter(swiftRouter),
  },
})
```

### 2. Ensure OpenStack session is available

The router expects `ctx.openstack` to be available with a `service("swift")` method.

### 3. Import types as needed

```typescript
import type { ContainerSummary, ObjectMetadata, AccountInfo } from "./types/swift"
```

## Implementation Features

1. **Service Name**: Uses `swift`
2. **URL Structure**: Swift uses path-based hierarchy (`/account/container/object`)
3. **Metadata Headers**: Different header prefixes (`X-Account-Meta-`, `X-Container-Meta-`, `X-Object-Meta-`)
4. **Binary Data**: `uploadObject` streams the raw `File` body via `octetInputParser` with metadata in `x-upload-*` request headers → `Transform` → `Readable.toWeb()` → Swift PUT; `downloadObject` streams Swift response as base64 chunks via async iterable mutation
5. **HTTP Methods**: Swift uses COPY method for object copying
6. **Response Codes**: 204 No Content for empty listings instead of 200
7. **Bulk Delete Response Format**: The `bulk_delete` middleware on some deployments only supports `text/plain` responses. All bulk delete operations explicitly set `Accept: text/plain` and parse `Number Deleted`, `Number Not Found`, and `Errors` from the plain text body via regex rather than `response.json()`
8. **signal-openstack `post()` Signature**: The client library's `post(path, body, options)` signature requires the request body as the second argument and options (including custom headers) as the third. Passing `{ body, headers }` as the second argument causes the entire object to be JSON-serialized as the request body

## Standards Compliance

This implementation follows:

- OpenStack Swift API v1 specification
- REST best practices
- TypeScript/tRPC conventions

## HTTP Response Codes

The implementation handles the following response codes per the official Swift API specification:

### Account Operations

- **GET (List Containers)**: 200 (with content), 204 (empty)
- **HEAD (Get Metadata)**: 204 (success), 401 (unauthorized)
- **POST (Update Metadata)**: 204 (success)
- **DELETE (Delete Account)**: 204 (success), 401 (unauthorized), 403 (forbidden), 404 (not found)

### Container Operations

- **GET (List Objects)**: 200 (with content), 204 (empty), 404 (not found)
- **PUT (Create/Update)**: 201 (created), 202 (accepted), 400 (bad request), 404 (not found), 507 (insufficient storage)
- **HEAD (Get Metadata)**: 204 (success)
- **POST (Update Metadata)**: 204 (success), 404 (not found)
- **DELETE (Delete Container)**: 204 (success), 404 (not found), 409 (not empty)

### Object Operations

- **GET (Download)**: 200 (success), 404 (not found), 416 (range not satisfiable)
- **PUT (Create/Replace)**: 201 (created), 404 (container not found), 408 (timeout), 411 (length required), 422 (checksum mismatch)
- **HEAD (Get Metadata)**: 200 (success)
- **POST (Update Metadata)**: 202 (accepted)
- **DELETE**: 204 (success)
- **COPY** (via PUT with X-Copy-From): 201 (created)

## Important HTTP Headers

### Request Headers

- **X-Newest**: (Boolean) Queries all replicas to return the most recent one. Supported on GET and HEAD operations for accounts, containers, and objects. Use only when absolutely needed as it's more expensive.
- **X-Auth-Token**: Authentication token for all operations
- **X-Service-Token**: Service token for advanced operations
- **If-Match / If-None-Match**: Conditional requests based on ETag
- **If-Modified-Since / If-Unmodified-Since**: Conditional requests based on modification time
- **Range**: Partial content requests for objects
- **X-Copy-From**: Used with PUT to copy objects (alternative to COPY method)
- **X-Fresh-Metadata**: Copy objects without existing metadata

### Metadata Headers

- **X-Account-Meta-{name}**: Account-level custom metadata
- **X-Container-Meta-{name}**: Container-level custom metadata
- **X-Object-Meta-{name}**: Object-level custom metadata
- **X-Remove-Account-Meta-{name}**: Remove account metadata
- **X-Remove-Container-Meta-{name}**: Remove container metadata

### Access Control

- **X-Container-Read**: Container read ACL
- **X-Container-Write**: Container write ACL
- **X-Account-Access-Control**: Account-level ACL (not supported with Keystone auth)

### Temporary URLs

- **X-Account-Meta-Temp-URL-Key**: Primary temporary URL key
- **X-Account-Meta-Temp-URL-Key-2**: Secondary temporary URL key (for key rotation)
- **X-Container-Meta-Temp-URL-Key**: Container-level temporary URL key
- **X-Container-Meta-Temp-URL-Key-2**: Secondary container-level key

### Object Lifecycle

- **X-Delete-At**: Unix timestamp when object should be deleted
- **X-Delete-After**: Seconds after which object should be deleted
- **Content-Length**: Required for object PUT operations
- **ETag**: MD5 checksum for integrity verification
- **Content-Type / Content-Encoding / Content-Disposition**: Content metadata

## Error Handling

All operations include comprehensive error handling:

- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict (e.g., non-empty container deletion)
- 413: Payload Too Large
- 422: Unprocessable Entity (ETag mismatch)

## Security Considerations

1. **Authentication**: All operations require valid OpenStack authentication
2. **ACLs**: Container-level access control supported
3. **Temporary URLs**: Support for time-limited access tokens
4. **Admin Operations**: Account deletion requires reseller admin privileges

## Performance Considerations

1. **Pagination**: Use `limit` and `marker` for large listings
2. **Large Uploads**: `uploadObject` uses `octetInputParser` for true streaming — the file body is never buffered in the BFF; for very large files, consider chunked/resumable uploads at the Swift SLO level
3. **Large Downloads**: `downloadObject` retrieves the full object; for large client-side downloads, prefer **Temporary URLs** so clients can download directly from Swift without proxying the entire payload through the BFF
4. **Metadata Only**: Use `getObjectMetadata` (HEAD) when you only need headers, not content
5. **Bulk Operations**: Use `bulkDelete` for deleting multiple objects efficiently
6. **Empty Container**: Use `emptyContainer` to remove all objects — it auto-selects bulk delete or individual deletes based on the `/info` capability check
7. **Folder Navigation**: Use `delimiter="/"` for hierarchical folder browsing

## Extended Capabilities

### Service Discovery

Query the Swift service to discover available features, limits, and configuration:

```typescript
const info = await trpc.storage.swift.getServiceInfo.query()
```

Returns information about:

- Maximum file sizes and object name lengths
- Available storage policies
- Bulk operation limits
- Large object configuration (SLO settings)
- Temporary URL support
- Container and account listing limits

### Pseudo-Hierarchical Folders

Manage folder-like structures using Swift's delimiter and prefix features:

**Key Features:**

- Zero-byte marker objects with trailing `/` for folder representation
- Breadcrumb navigation helpers for path parsing
- Recursive and non-recursive deletion options
- Move operations using copy + delete pattern
- Content-Type: `application/directory` for folder markers

**Helper Functions:**

- `parseBreadcrumb(path)` - Convert path to breadcrumb segments
- `normalizeFolderPath(path)` - Ensure trailing slash
- `isFolderMarker(name, bytes)` - Detect folder markers
- `extractFolders(objects, prefix)` - Get folder names from object list

### Temporary URL Generation

Generate time-limited, cryptographically signed URLs for secure object access without authentication:

**Features:**

- HMAC-SHA256 signature algorithm
- Configurable expiration time
- Supports GET, PUT, POST, DELETE methods
- Optional Content-Disposition filename parameter
- Works with account-level or container-level temp URL keys

**Security:**

- Requires temp URL key configured on account or container
- Signature prevents URL tampering
- Time-based expiration enforced by Swift
- No authentication required for URL access

**Use Cases:**

- Share files with external parties
- Temporary upload permissions
- Time-limited download links
- Direct browser uploads without exposing credentials

## Next Steps

1. Add pause/resume support for individual file uploads (requires SLO segment management)
2. Add folder upload support with directory structure preservation as pseudo-folder prefixes
3. Add support for container synchronization
4. Implement form POST for browser uploads
5. Add support for archive extraction (tar files)
6. Implement CORS configuration helpers
7. Add support for Static Large Object (SLO) manifest operations

## References

- [OpenStack Swift API Documentation](https://docs.openstack.org/api-ref/object-store/)
- [OpenStack Swift Overview](https://docs.openstack.org/swift/latest/api/object_api_v1_overview.html)
- [Swift Large Objects](https://docs.openstack.org/swift/latest/api/large_objects.html)
- [Swift Temporary URLs](https://docs.openstack.org/swift/latest/api/temporary_url_middleware.html)
- [Swift Pseudo-Hierarchical Folders](https://docs.openstack.org/swift/latest/api/pseudo-hierarchical-folders-directories.html)
- [Swift Discoverability (/info endpoint)](https://docs.openstack.org/swift/latest/api/discoverability.html)
- [Swift Bulk Delete](https://docs.openstack.org/swift/latest/api/bulk-delete.html)
