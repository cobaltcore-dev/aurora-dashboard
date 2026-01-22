# Image Service BFF API Documentation

This document describes the Backend for Frontend (BFF) endpoints for the Image Service, which provides a TypeScript interface to the OpenStack Glance Image Service API v2.

## Base Configuration

All endpoints are protected procedures that require authentication and operate within a specific OpenStack project context.

## Image Management Endpoints

### List Images

Retrieves a list of images with optional filtering and sorting.

**Endpoint:** `listImages`  
**Method:** Query  
**Input Schema:** `listImagesInputSchema`

#### Parameters

| Parameter          | Type    | Description                                                              | Default      |
| ------------------ | ------- | ------------------------------------------------------------------------ | ------------ |
| `sort_key`         | enum    | Sort field (`name`, `status`, `created_at`, etc.)                        | `created_at` |
| `sort_dir`         | enum    | Sort direction (`asc`, `desc`)                                           | `desc`       |
| `sort`             | string  | **Preferred** sort syntax (e.g., `name:asc`, `created_at:desc,name:asc`) | -            |
| `limit`            | number  | Maximum number of results (1-1000)                                       | -            |
| `marker`           | string  | Pagination marker (image ID)                                             | -            |
| `name`             | string  | Filter by image name                                                     | -            |
| `status`           | enum    | Filter by status (`queued`, `active`, `deleted`, etc.)                   | -            |
| `visibility`       | enum    | Filter by visibility (`public`, `private`, `shared`, `community`, `all`) | -            |
| `owner`            | string  | Filter by owner (project ID)                                             | -            |
| `protected`        | boolean | Filter by protection status                                              | -            |
| `container_format` | enum    | Filter by container format (`bare`, `ovf`, `docker`, etc.)               | -            |
| `disk_format`      | enum    | Filter by disk format (`qcow2`, `raw`, `vmdk`, etc.)                     | -            |
| `size_min`         | number  | Minimum size in bytes                                                    | -            |
| `size_max`         | number  | Maximum size in bytes                                                    | -            |
| `min_ram`          | number  | Minimum RAM requirement in MB                                            | -            |
| `min_disk`         | number  | Minimum disk requirement in GB                                           | -            |
| `tag`              | string  | Filter by tag                                                            | -            |
| `os_type`          | enum    | Filter by OS type (`linux`, `windows`)                                   | -            |
| `os_hidden`        | boolean | Filter by OS hidden status                                               | -            |
| `member_status`    | enum    | Filter by member status (`pending`, `accepted`, `rejected`, `all`)       | -            |
| `created_at`       | string  | Filter by creation time (format: `operator:ISO8601_time`)                | -            |
| `updated_at`       | string  | Filter by update time (format: `operator:ISO8601_time`)                  | -            |

#### Sorting Behavior

The API supports two sorting syntaxes:

1. **Modern syntax (recommended)**: Use the `sort` parameter with format `field:direction`

   - Single field: `sort: "name:asc"`
   - Multiple fields: `sort: "name:asc,created_at:desc"`

2. **Legacy syntax**: Use separate `sort_key` and `sort_dir` parameters
   - This is automatically converted to the modern syntax internally

**Note**: The system defaults to `created_at:desc` if no sorting is specified.

#### Example Requests

```typescript
// Using modern sort syntax (recommended)
const imagesSorted = await client.compute.image.listImages.query({
  sort: "name:asc",
  status: "active",
  visibility: "private",
  limit: 10,
})

// Multi-field sorting
const imagesMultiSort = await client.compute.image.listImages.query({
  sort: "status:asc,name:asc,created_at:desc",
  visibility: "public",
})

// Using legacy syntax (still supported)
const imagesLegacy = await client.compute.image.listImages.query({
  sort_key: "name",
  sort_dir: "asc",
  status: "active",
})

// Filtering examples
const filteredImages = await client.compute.image.listImages.query({
  sort: "created_at:desc",
  os_type: "linux",
  disk_format: "qcow2",
  size_min: 1000000000, // 1GB minimum
  tags: "production",
})
```

#### Response

Returns `GlanceImage[]` or `undefined` on error.

---

### List Images with Pagination

Retrieves images with full pagination support including next/first page URLs.

**Endpoint:** `listImagesWithPagination`  
**Method:** Query  
**Input Schema:** `imagesPaginatedInputSchema`

#### Additional Parameters

| Parameter | Type   | Description            |
| --------- | ------ | ---------------------- |
| `first`   | string | URL for the first page |
| `next`    | string | URL for the next page  |

#### Example Request

```typescript
const paginatedImages = await client.compute.image.listImagesWithPagination.query({
  sort: "name:asc",
  limit: 25,
  visibility: "public",
})

// Using next page URL
const nextPage = await client.compute.image.listImagesWithPagination.query({
  next: paginatedImages.next,
})
```

#### Response

Returns `ImagesPaginatedResponse` with:

- `images`: Array of `GlanceImage` objects
- `first`: URL for first page (optional)
- `next`: URL for next page (optional)
- `schema`: Schema URL (optional)

---

### Get Image by ID

Retrieves a specific image by its UUID.

**Endpoint:** `getImageById`  
**Method:** Query  
**Input Schema:** `getImageByIdInputSchema`

#### Parameters

| Parameter | Type          | Description |
| --------- | ------------- | ----------- |
| `imageId` | string (UUID) | Image UUID  |

#### Example Request

```typescript
const image = await client.compute.image.getImageById.query({
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
})
```

#### Response

Returns `GlanceImage` or `undefined` if not found or access denied.

#### Error Handling

- **404**: Image not found
- **403**: Access forbidden

---

### Create Image

Creates a new image with metadata only (no binary data).

**Endpoint:** `createImage`  
**Method:** Mutation  
**Input Schema:** `createImageInputSchema`

#### Parameters

| Parameter          | Type          | Description                             | Default   |
| ------------------ | ------------- | --------------------------------------- | --------- |
| `name`             | string        | Image name                              | -         |
| `id`               | string (UUID) | Custom UUID (auto-generated if omitted) | -         |
| `container_format` | enum          | Container format                        | -         |
| `disk_format`      | enum          | Disk format                             | -         |
| `visibility`       | enum          | Image visibility                        | `private` |
| `protected`        | boolean       | Protection status                       | `false`   |
| `min_ram`          | number        | Minimum RAM in MB                       | `0`       |
| `min_disk`         | number        | Minimum disk in GB                      | `0`       |
| `tags`             | string[]      | Image tags                              | `[]`      |
| `os_type`          | enum          | Operating system type                   | -         |
| `os_distro`        | string        | OS distribution                         | -         |
| `os_version`       | string        | OS version                              | -         |
| `architecture`     | string        | System architecture                     | -         |
| `os_hidden`        | boolean       | Hide from OS lists                      | `false`   |

#### Hardware Properties

| Parameter             | Type    | Description                   |
| --------------------- | ------- | ----------------------------- |
| `hw_disk_bus`         | string  | Disk bus type                 |
| `hw_scsi_model`       | string  | SCSI model                    |
| `hw_serial`           | string  | Serial number                 |
| `hw_qemu_guest_agent` | boolean | QEMU guest agent support      |
| `hw_vif_model`        | string  | Virtual interface model       |
| `hw_rng_model`        | string  | Random number generator model |
| `hw_machine_type`     | string  | Machine type                  |

#### Example Request

```typescript
const newImage = await client.compute.image.createImage.mutate({
  name: "Ubuntu 22.04 LTS",
  container_format: "bare",
  disk_format: "qcow2",
  visibility: "private",
  os_type: "linux",
  os_distro: "ubuntu",
  os_version: "22.04",
  min_ram: 1024,
  min_disk: 10,
  tags: ["ubuntu", "lts", "server"],
})
```

#### Response

Returns `GlanceImage` or `undefined` on error.

---

### Upload Image Data

Uploads binary data to an existing image with real-time progress tracking support. Two methods are available:

#### Method 1: tRPC Mutation with Real-Time Progress

**Endpoint:** `uploadImage`  
**Method:** Mutation  
**Input Schema:** `uploadImageInputSchema`

Use this for uploading files via tRPC protocol with support for real-time progress tracking via the `watchUploadProgress` subscription.

**Features:**

- Chunked upload for optimal performance
- Real-time progress events emitted during upload
- Non-blocking progress tracking (generator yields between chunks)
- Automatic cleanup of progress tracking after upload completes
- Full error handling and event propagation

#### Method 2: HTTP Endpoint (Fallback)

**Endpoint:** `POST /polaris-bff/upload-image`  
**Method:** HTTP POST  
**Content-Type:** multipart/form-data

Alternative HTTP endpoint available as additional option for file uploads (does not support real-time progress).

#### Parameters (Both Methods)

| Parameter | Type   | Description                                 |
| --------- | ------ | ------------------------------------------- |
| `imageId` | string | UUID of the target image (must be `queued`) |
| `file`    | File   | Binary image data                           |

#### Upload Progress Tracking

When using the tRPC `uploadImage` mutation, you can track real-time progress using the `watchUploadProgress` subscription:

**Progress Data Structure:**

```typescript
interface UploadProgress {
  uploaded: number // Bytes uploaded so far
  total: number // Total bytes to upload
  percent: number // Percentage complete (0-100)
}
```

#### Example Request (tRPC React with Progress Tracking)

```typescript
function ImageUploadForm() {
  const [uploadId, setUploadId] = useState<string | null>(null)
  const uploadMutation = trpcReact.compute.uploadImage.useMutation()

  // Watch progress in real-time - subscription auto-manages lifecycle
  const { data: progress } = trpcReact.compute.watchUploadProgress.useSubscription(
    { uploadId: uploadId || "" },
    {
      enabled: !!uploadId && uploadMutation.isPending,
      onData: (data) => {
        if (data?.percent !== undefined) {
          console.log(`Upload progress: ${data.percent}% (${data.uploaded}/${data.total} bytes)`)
          updateProgressBar(data.percent)
        }
      },
    }
  )

  const handleUpload = async (imageId: string, file: File) => {
    setUploadId(imageId)
    try {
      const result = await uploadMutation.mutateAsync({
        imageId,
        file,
      })
      console.log("Upload result:", result)
    } finally {
      setUploadId(null)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleUpload("image-uuid", file)
          }
        }}
      />
      {uploadMutation.isPending && progress && (
        <progress value={progress.percent ?? 0} max={100} />
      )}
      <span>{progress?.percent ?? 0}% complete</span>
    </div>
  )
}
```

#### React Component Example (Complete)

```typescript
function ImageUploadComponent() {
  const [uploadId, setUploadId] = useState<string | null>(null)
  const uploadMutation = trpcReact.compute.uploadImage.useMutation()

  // Subscribe to progress updates - enabled during upload
  const { data: progress } = trpcReact.compute.watchUploadProgress.useSubscription(
    { uploadId: uploadId || "" },
    {
      enabled: !!uploadId && uploadMutation.isPending,
      onData: (data) => {
        if (data?.percent !== undefined) {
          console.log(`Upload: ${data.percent}%`)
        }
      },
    }
  )

  const handleUpload = async (imageId: string, file: File) => {
    setUploadId(imageId)
    try {
      const result = await uploadMutation.mutateAsync({
        imageId,
        file,
      })
      console.log("Upload complete:", result)
    } finally {
      setUploadId(null)
    }
  }

  return (
    <div className="upload-container">
      <input
        type="file"
        id="file-input"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleUpload("image-uuid", file)
          }
        }}
        disabled={uploadMutation.isPending}
      />

      {uploadMutation.isPending && progress && (
        <div className="progress-section">
          <progress
            value={progress.percent ?? 0}
            max={100}
          />
          <span>
            {progress.percent}% ({formatBytes(progress.uploaded)} / {formatBytes(progress.total)})
          </span>
        </div>
      )}

      {uploadMutation.isSuccess && (
        <div className="success-message">Upload completed successfully</div>
      )}

      {uploadMutation.isError && (
        <div className="error-message">
          Upload failed: {uploadMutation.error.message}
        </div>
      )}
    </div>
  )
}
```

#### Example Request (HTTP Fallback)

```typescript
const fileInput = document.getElementById("imageFile") as HTMLInputElement
const file = fileInput.files?.[0]
const imageId = "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac"

if (file) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("imageId", imageId)

  const response = await fetch("/polaris-bff/upload-image", {
    method: "POST",
    body: formData,
  })

  if (response.ok) {
    const result = await response.json() // { success: true, imageId }
  }
}
```

#### Response

Returns `{ success: boolean; imageId: string }` on success.

#### Error Handling

- **400**: Invalid upload data or missing imageId
- **403**: Access forbidden - cannot upload to image
- **404**: Image not found
- **409**: Image not in valid state for upload (must be `queued`)
- **413**: File data too large
- **415**: Unsupported content type
- **500**: Upload failed or service unavailable

---

### Watch Upload Progress

Subscribes to real-time upload progress events for an ongoing image upload.

**Endpoint:** `watchUploadProgress`  
**Method:** Subscription  
**Input Schema:** `{ uploadId: string }`

Provides real-time progress updates as file chunks are uploaded. This subscription emits progress data immediately when subscribed, then continues emitting updates as chunks are uploaded until the upload completes.

#### Features

- **Immediate Initial State**: Returns current progress immediately upon subscription (no delay)
- **Event-Driven Updates**: Updates emitted in real-time without polling
- **Non-Blocking**: Progresses between chunks without blocking the upload stream
- **Automatic Cleanup**: Listeners are cleaned up when subscription ends
- **Complete Event**: Emits completion signal when upload finishes

#### Parameters

| Parameter  | Type   | Description                                                             |
| ---------- | ------ | ----------------------------------------------------------------------- |
| `uploadId` | string | UUID of the image being uploaded (matches the imageId from uploadImage) |

#### Response Data

Yields `UploadProgress` objects as upload progresses:

```typescript
interface UploadProgress {
  uploaded: number // Bytes uploaded so far
  total: number // Total bytes to upload
  percent: number // Percentage complete (0-100, rounded)
}
```

#### Example Usage (React Hook)

```typescript
// Using tRPC React useSubscription hook
function UploadProgressDisplay({ uploadId }: { uploadId: string }) {
  const { data: progress, isError } = trpcReact.compute.watchUploadProgress.useSubscription(
    { uploadId },
    {
      enabled: !!uploadId,
      onData: (data) => {
        console.log(`${data?.percent}% (${data?.uploaded}/${data?.total} bytes)`)
      },
    }
  )

  if (isError) {
    return <div className="error">Progress tracking failed</div>
  }

  if (progress) {
    return (
      <div className="progress">
        <progress value={progress.percent} max={100} />
        <span>{progress.percent}%</span>
      </div>
    )
  }

  return <div>Waiting for upload...</div>
}
```

#### Complete React Integration Example

```typescript
function ImageUploadComponent() {
  const [uploadId, setUploadId] = useState<string | null>(null)
  const uploadImageMutation = trpcReact.compute.uploadImage.useMutation()

  // Watch upload progress - subscription auto-manages lifecycle via enabled
  const { data: progress } = trpcReact.compute.watchUploadProgress.useSubscription(
    { uploadId: uploadId || "" },
    {
      enabled: !!uploadId && uploadImageMutation.isPending,
      onData: (data) => {
        console.log(`Upload: ${data?.percent}%`)
      },
    }
  )

  const handleUpload = async (imageId: string, file: File) => {
    setUploadId(imageId)

    try {
      const result = await uploadImageMutation.mutateAsync({
        imageId,
        file,
      })
      console.log("Upload complete:", result)
    } finally {
      setUploadId(null)
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleUpload("image-uuid", file)
          }
        }}
      />

      {uploadImageMutation.isPending && progress && (
        <div className="progress-container">
          <progress value={progress.percent ?? 0} max={100} />
          <span>
            {progress.percent}% ({formatBytes(progress.uploaded)} / {formatBytes(progress.total)})
          </span>
        </div>
      )}

      {uploadImageMutation.isSuccess && (
        <div className="success">Upload completed successfully</div>
      )}

      {uploadImageMutation.isError && (
        <div className="error">Upload failed: {uploadImageMutation.error.message}</div>
      )}
    </div>
  )
}
```

#### Advanced Example with Error States

```typescript
function useUploadWithProgress(imageId: string, file: File | null) {
  const [uploadId, setUploadId] = useState<string | null>(null)
  const uploadMutation = trpcReact.compute.uploadImage.useMutation()

  // Subscribe to progress updates
  const { data: progress, isError: isProgressError } =
    trpcReact.compute.watchUploadProgress.useSubscription(
      { uploadId: uploadId || "" },
      {
        enabled: !!uploadId && uploadMutation.isPending,
      }
    )

  const startUpload = useCallback(async () => {
    if (!file) return

    setUploadId(imageId)
    try {
      await uploadMutation.mutateAsync({
        imageId,
        file,
      })
    } finally {
      setUploadId(null)
    }
  }, [imageId, file, uploadMutation])

  return {
    startUpload,
    progress,
    isUploading: uploadMutation.isPending,
    isSuccess: uploadMutation.isSuccess,
    isError: uploadMutation.isError || isProgressError,
    error: uploadMutation.error,
  }
}

// Usage in component
function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const { startUpload, progress, isUploading, isSuccess, isError, error } =
    useUploadWithProgress("image-uuid", file)

  return (
    <div>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      <button onClick={startUpload} disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      {isUploading && progress && (
        <div className="progress-bar">
          <div style={{ width: `${progress.percent}%` }}>
            {progress.percent}%
          </div>
        </div>
      )}

      {isSuccess && <p className="success">Upload completed!</p>}
      {isError && <p className="error">Error: {error?.message}</p>}
    </div>
  )
}
```

#### Integration Pattern with Upload Mutation (Concurrent)

The recommended pattern is to use `useSubscription` with the `enabled` parameter to keep subscription active during upload:

```typescript
function ImageUploadWithProgress() {
  const [imageId, setImageId] = useState<string | null>(null)
  const uploadMutation = trpcReact.compute.uploadImage.useMutation()

  // Subscription automatically manages lifecycle through enabled parameter
  // It activates when upload starts and deactivates when upload completes
  const { data: progress } = trpcReact.compute.watchUploadProgress.useSubscription(
    { uploadId: imageId || "" },
    {
      enabled: !!imageId && uploadMutation.isPending,
      onData: (data) => {
        if (data?.percent) {
          console.log(`Progress: ${data.percent}%`)
        }
      },
    }
  )

  const handleUpload = async (imageId: string, file: File) => {
    setImageId(imageId)
    try {
      await uploadMutation.mutateAsync({
        imageId,
        file,
      })
    } finally {
      setImageId(null)
    }
  }

  return (
    <div>
      <button
        onClick={() => {
          const fileInput = document.getElementById("fileInput") as HTMLInputElement
          const file = fileInput.files?.[0]
          if (file) {
            handleUpload("image-id", file)
          }
        }}
        disabled={uploadMutation.isPending}
      >
        {uploadMutation.isPending ? "Uploading..." : "Upload Image"}
      </button>

      <input id="fileInput" type="file" disabled={uploadMutation.isPending} />

      {uploadMutation.isPending && progress && (
        <ProgressBar
          percent={progress.percent ?? 0}
          uploaded={progress.uploaded}
          total={progress.total}
        />
      )}
    </div>
  )
}
```

#### Notes

- The subscription emits the **current progress state immediately** when subscribed (if upload is active)
- Progress updates are emitted for each chunk uploaded
- The subscription automatically completes when the upload finishes
- If the upload errors, an error event is emitted and the subscription closes
- Multiple subscriptions to the same uploadId are independent (each receives their own stream)
- Progress data is cleaned up from server memory after upload completes

**tRPC React Integration Notes:**

- Use the `enabled` parameter to control subscription lifecycle - the subscription activates when `enabled` is true and deactivates when it becomes false
- Combine with `uploadImage` mutation's `isPending` state: `enabled: !!uploadId && uploadMutation.isPending`
- The subscription automatically cleans up when the component unmounts or when `enabled` becomes false

---

### Update Image

Updates image metadata using JSON Patch operations.

**Endpoint:** `updateImage`  
**Method:** Mutation  
**Input Schema:** `updateImageInputSchema`

#### Parameters

| Parameter    | Type                 | Description                    |
| ------------ | -------------------- | ------------------------------ |
| `imageId`    | string (UUID)        | Image UUID                     |
| `operations` | JSONPatchOperation[] | Array of JSON Patch operations |

#### JSON Patch Operations

| Field   | Type   | Description                                                         |
| ------- | ------ | ------------------------------------------------------------------- |
| `op`    | enum   | Operation type (`add`, `remove`, `replace`, `move`, `copy`, `test`) |
| `path`  | string | JSON Pointer path (e.g., `/name`, `/tags`)                          |
| `value` | any    | New value (optional for `remove`)                                   |
| `from`  | string | Source path (for `move`/`copy`)                                     |

#### Example Request

```typescript
const updatedImage = await client.compute.image.updateImage.mutate({
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
  operations: [
    {
      op: "replace",
      path: "/name",
      value: "Ubuntu 22.04 LTS Updated",
    },
    {
      op: "add",
      path: "/tags/-",
      value: "production",
    },
    {
      op: "remove",
      path: "/hw_serial",
    },
  ],
})
```

#### Response

Returns updated `GlanceImage` or `undefined` on error.

#### Error Handling

- **404**: Image not found
- **403**: Access forbidden
- **409**: Image not in valid state for update
- **400**: Invalid update data

---

### Update Image Visibility

Updates only the visibility property of an image.

**Endpoint:** `updateImageVisibility`  
**Method:** Mutation  
**Input Schema:** `updateImageVisibilityInputSchema`

#### Parameters

| Parameter    | Type          | Description                                                 |
| ------------ | ------------- | ----------------------------------------------------------- |
| `imageId`    | string (UUID) | Image UUID                                                  |
| `visibility` | enum          | New visibility (`public`, `private`, `shared`, `community`) |

#### Example Request

```typescript
const updatedImage = await client.compute.image.updateImageVisibility.mutate({
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
  visibility: "public",
})
```

#### Response

Returns updated `GlanceImage` or `undefined` on error.

---

### Delete Image

Permanently deletes an image.

**Endpoint:** `deleteImage`  
**Method:** Mutation  
**Input Schema:** `deleteImageInputSchema`

#### Parameters

| Parameter | Type          | Description |
| --------- | ------------- | ----------- |
| `imageId` | string (UUID) | Image UUID  |

#### Example Request

```typescript
const success = await client.compute.image.deleteImage.mutate({
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
})
```

#### Response

Returns `boolean` - `true` on success, `false` on failure.

#### Error Handling

- **403**: Cannot delete protected image
- **404**: Image not found

---

### Deactivate Image

Deactivates an image (admin operation).

**Endpoint:** `deactivateImage`  
**Method:** Mutation  
**Input Schema:** `deactivateImageInputSchema`

#### Example Request

```typescript
const success = await client.compute.image.deactivateImage.mutate({
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
})
```

#### Response

Returns `boolean` - `true` on success, `false` on failure.

#### Error Handling

- **403**: Access forbidden (admin-only operation)
- **404**: Image not found
- **409**: Image not in valid state

---

### Reactivate Image

Reactivates a deactivated image (admin operation).

**Endpoint:** `reactivateImage`  
**Method:** Mutation  
**Input Schema:** `reactivateImageInputSchema`

#### Example Request

```typescript
const success = await client.compute.image.reactivateImage.mutate({
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
})
```

#### Response

Returns `boolean` - `true` on success, `false` on failure.

## Image Member Management Endpoints

Image members allow sharing private images with specific projects.

### List Image Members

Retrieves all members for a shared image.

**Endpoint:** `listImageMembers`  
**Method:** Query  
**Input Schema:** `listImageMembersInputSchema`

#### Parameters

| Parameter | Type          | Description |
| --------- | ------------- | ----------- |
| `imageId` | string (UUID) | Image UUID  |

#### Example Request

```typescript
const members = await client.compute.image.listImageMembers.query({
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
})
```

#### Response

Returns `ImageMember[]` or `undefined` on error.

#### Error Handling

- **404**: Image not found
- **403**: Access forbidden (only shared images have members)

---

### Get Image Member

Retrieves a specific member of an image.

**Endpoint:** `getImageMember`  
**Method:** Query  
**Input Schema:** `getImageMemberInputSchema`

#### Parameters

| Parameter  | Type          | Description       |
| ---------- | ------------- | ----------------- |
| `imageId`  | string (UUID) | Image UUID        |
| `memberId` | string        | Member project ID |

#### Example Request

```typescript
const member = await client.compute.image.getImageMember.query({
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
  memberId: "660e8400-e29b-41d4-a716-446655440001",
})
```

#### Response

Returns `ImageMember` or `undefined` if not found.

---

### Create Image Member

Adds a new member to a shared image.

**Endpoint:** `createImageMember`  
**Method:** Mutation  
**Input Schema:** `createImageMemberInputSchema`

#### Parameters

| Parameter | Type          | Description                 |
| --------- | ------------- | --------------------------- |
| `imageId` | string (UUID) | Image UUID                  |
| `member`  | string        | Project ID to add as member |

#### Example Request

```typescript
const newMember = await client.compute.image.createImageMember.mutate({
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
  member: "660e8400-e29b-41d4-a716-446655440001",
})
```

#### Response

Returns `ImageMember` or `undefined` on error.

#### Error Handling

- **404**: Image not found
- **403**: Access forbidden (must be image owner)
- **400**: Invalid member or image visibility
- **409**: Member already exists

---

### Update Image Member

Updates the status of an image member.

**Endpoint:** `updateImageMember`  
**Method:** Mutation  
**Input Schema:** `updateImageMemberInputSchema`

#### Parameters

| Parameter  | Type          | Description                                    |
| ---------- | ------------- | ---------------------------------------------- |
| `imageId`  | string (UUID) | Image UUID                                     |
| `memberId` | string        | Member project ID                              |
| `status`   | enum          | New status (`pending`, `accepted`, `rejected`) |

#### Example Request

```typescript
const updatedMember = await client.compute.image.updateImageMember.mutate({
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
  memberId: "660e8400-e29b-41d4-a716-446655440001",
  status: "accepted",
})
```

#### Response

Returns updated `ImageMember` or `undefined` on error.

#### Error Handling

- **404**: Image or member not found
- **403**: Access forbidden (only the member can update their status)
- **400**: Invalid status value

---

### Delete Image Member

Removes a member from an image.

**Endpoint:** `deleteImageMember`  
**Method:** Mutation  
**Input Schema:** `deleteImageMemberInputSchema`

#### Parameters

| Parameter  | Type          | Description       |
| ---------- | ------------- | ----------------- |
| `imageId`  | string (UUID) | Image UUID        |
| `memberId` | string        | Member project ID |

#### Example Request

```typescript
const success = await client.compute.image.deleteImageMember.mutate({
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
  memberId: "660e8400-e29b-41d4-a716-446655440001",
})
```

#### Response

Returns `boolean` - `true` on success, `false` on failure.

#### Error Handling

- **404**: Image or member not found
- **403**: Access forbidden (must be image owner)

## Bulk Image Operations

These endpoints support performing operations on multiple images in parallel, with detailed tracking of successes and failures.

### Delete Images (Bulk)

Deletes multiple images in parallel.

**Endpoint:** `deleteImages`  
**Method:** Mutation  
**Input Schema:** `deleteImagesInputSchema`

#### Parameters

| Parameter  | Type             | Description          |
| ---------- | ---------------- | -------------------- |
| `imageIds` | string[] (UUIDs) | Array of image UUIDs |

#### Example Request

```typescript
const result = await client.compute.image.deleteImages.mutate({
  imageIds: [
    "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
    "b95abd86-55b3-4413-a5b7-6cd8a6bd99ad",
    "c95abd86-55b3-4413-a5b7-6cd8a6bd99ae",
  ],
})
```

#### Response

Returns `BulkOperationResult` with:

- `successful`: Array of image IDs that were successfully deleted
- `failed`: Array of objects containing `id` and `error` for failed deletions

```typescript
interface BulkOperationResult {
  successful: string[]
  failed: Array<{ id: string; error: string }>
}
```

#### Example Response

```typescript
{
  successful: [
    "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
    "b95abd86-55b3-4413-a5b7-6cd8a6bd99ad",
  ],
  failed: [
    {
      id: "c95abd86-55b3-4413-a5b7-6cd8a6bd99ae",
      error: "404",
    },
  ],
}
```

---

### Activate Images (Bulk)

Reactivates multiple deactivated images in parallel.

**Endpoint:** `activateImages`  
**Method:** Mutation  
**Input Schema:** `activateImagesInputSchema`

#### Parameters

| Parameter  | Type             | Description          |
| ---------- | ---------------- | -------------------- |
| `imageIds` | string[] (UUIDs) | Array of image UUIDs |

#### Example Request

```typescript
const result = await client.compute.image.activateImages.mutate({
  imageIds: ["a85abd86-55b3-4413-a5b7-6cd8a6bd99ac", "b95abd86-55b3-4413-a5b7-6cd8a6bd99ad"],
})
```

#### Response

Returns `BulkOperationResult` with:

- `successful`: Array of image IDs that were successfully activated
- `failed`: Array of objects containing `id` and `error` for failed activations

#### Example Response

```typescript
{
  successful: [
    "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
    "b95abd86-55b3-4413-a5b7-6cd8a6bd99ad",
  ],
  failed: [],
}
```

#### Notes

- This operation calls the `reactivate` action on each image
- Only works on deactivated images (status `deactivated`)
- Typically requires admin privileges

---

### Deactivate Images (Bulk)

Deactivates multiple images in parallel.

**Endpoint:** `deactivateImages`  
**Method:** Mutation  
**Input Schema:** `deactivateImagesInputSchema`

#### Parameters

| Parameter  | Type             | Description          |
| ---------- | ---------------- | -------------------- |
| `imageIds` | string[] (UUIDs) | Array of image UUIDs |

#### Example Request

```typescript
const result = await client.compute.image.deactivateImages.mutate({
  imageIds: [
    "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
    "b95abd86-55b3-4413-a5b7-6cd8a6bd99ad",
    "c95abd86-55b3-4413-a5b7-6cd8a6bd99ae",
  ],
})
```

#### Response

Returns `BulkOperationResult` with:

- `successful`: Array of image IDs that were successfully deactivated
- `failed`: Array of objects containing `id` and `error` for failed deactivations

#### Example Response

```typescript
{
  successful: [
    "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
    "b95abd86-55b3-4413-a5b7-6cd8a6bd99ad",
    "c95abd86-55b3-4413-a5b7-6cd8a6bd99ae",
  ],
  failed: [],
}
```

#### Notes

- Deactivated images cannot be used but are not deleted
- Typically requires admin privileges
- Use `activateImages` to restore deactivated images

---

### List Shared Images by Member Status

Retrieves shared images filtered by their member status (pending, accepted, or rejected) for the current project. This endpoint:

1. Fetches all shared images from OpenStack
2. Filters out images owned by the current project
3. Retrieves member data for each shared image in parallel
4. Returns only images matching the requested member status

**Endpoint:** `listSharedImagesByMemberStatus`  
**Method:** Query  
**Input Schema:** `{ memberStatus: "pending" | "accepted" | "rejected" }`

#### Parameters

| Parameter      | Type                                     | Description                                         | Required |
| -------------- | ---------------------------------------- | --------------------------------------------------- | -------- |
| `memberStatus` | enum (`pending`, `accepted`, `rejected`) | Filter by the project's member status for the image | Yes      |

#### How It Works

**Step 1: Fetch Shared Images**

- Queries the Glance API with `visibility=shared` and `member_status={memberStatus}` parameters

**Step 2: Filter by Owner**

- Removes images owned by the current project (you cannot be a member of your own images)
- Only processes images from other projects

**Step 3: Fetch Member Data (Parallel)**

- For each shared image, fetches the member record for the current project
- Uses `Promise.all()` for parallel execution
- Gracefully handles missing member records (404 responses)

**Step 4: Filter by Member Status**

- Matches images where the member status exactly equals the requested status
- Validates member data and filters out invalid/unparseable records

#### Example Requests

```typescript
// Get images shared with me that are pending acceptance
const pendingImages = await client.compute.image.listSharedImagesByMemberStatus.query({
  memberStatus: "pending",
})

// Get images I've already accepted
const acceptedImages = await client.compute.image.listSharedImagesByMemberStatus.query({
  memberStatus: "accepted",
})

// Get images I've rejected
const rejectedImages = await client.compute.image.listSharedImagesByMemberStatus.query({
  memberStatus: "rejected",
})
```

#### Response

Returns `GlanceImage[]` - An array of images filtered by the requested member status.

```typescript
;[
  {
    id: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
    name: "Ubuntu 22.04 LTS",
    status: "active",
    visibility: "shared",
    owner: "660e8400-e29b-41d4-a716-446655440000",
    disk_format: "qcow2",
    container_format: "bare",
    size: 2147483648,
    // ... additional image properties
  },
  // ... more images
]
```

#### Error Handling

- **401/403**: Unauthorized or forbidden access
- **500**: Internal server error during image or member data fetching
- Returns empty array `[]` if:
  - No shared images exist
  - All shared images are owned by the current project
  - No images match the requested member status
  - Member data fetch fails for all images

#### Performance Notes

- Member data is fetched in **parallel** using `Promise.all()` for optimal performance
- Network errors during individual member data fetches are handled gracefully
- Failed member data requests return `null` and are filtered out
- Typical response time depends on the number of shared images and network latency

#### Use Cases

**1. Pending Invitations Dashboard**

```typescript
const pendingSharedImages = await client.compute.image.listSharedImagesByMemberStatus.query({
  memberStatus: "pending",
})
// Display images waiting for project acceptance
```

**2. Accepted Images Management**

```typescript
const myAcceptedImages = await client.compute.image.listSharedImagesByMemberStatus.query({
  memberStatus: "accepted",
})
// Use these images for launching instances
```

**3. Rejected Images Review**

```typescript
const rejectedImages = await client.compute.image.listSharedImagesByMemberStatus.query({
  memberStatus: "rejected",
})
// Review images that were previously rejected
```

#### Authorization

- Requires valid OpenStack authentication
- Returns only images shared with the current project
- Owner project information is preserved in the response

---

## Data Types

### GlanceImage

Core image object containing metadata and properties.

```typescript
interface GlanceImage {
  id: string
  name?: string
  status?: "queued" | "saving" | "active" | "killed" | "deleted" | "pending_delete" | "deactivated" | "importing"
  visibility?: "public" | "private" | "shared" | "community"
  protected?: boolean
  container_format?: "bare" | "ovf" | "ova" | "docker" | "ami" | "ari" | "aki" | "compressed"
  disk_format?: "ami" | "ari" | "aki" | "vhd" | "vhdx" | "vmdk" | "raw" | "qcow2" | "vdi" | "iso" | "ploop"
  size?: number
  min_ram?: number
  min_disk?: number
  created_at?: string
  updated_at?: string
  owner?: string
  tags?: string[]
  // ... additional properties
}
```

### ImageMember

Represents a project that has been granted access to a shared image.

```typescript
interface ImageMember {
  member_id: string
  image_id: string
  status: "pending" | "accepted" | "rejected"
  created_at: string
  updated_at: string
  schema?: string
}
```

### BulkOperationResult

Result of bulk operations (delete, activate, deactivate images).

```typescript
interface BulkOperationResult {
  successful: string[]
  failed: Array<{ id: string; error: string }>
}
```

The `successful` array contains image IDs that completed the operation successfully. The `failed` array contains objects with the image `id` and `error` message for operations that failed.

## Error Handling

All endpoints return `undefined` or `false` on error, with detailed error logging. Common HTTP status codes:

- **400**: Bad Request - Invalid parameters or data
- **403**: Forbidden - Access denied or insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **409**: Conflict - Resource in invalid state for operation
- **413**: Request Entity Too Large - Upload size exceeds limits
- **415**: Unsupported Media Type - Invalid content type

## OpenStack Glance API Reference

This BFF layer maps directly to the [OpenStack Glance Image Service API v2](https://docs.openstack.org/api-ref/image/v2/). All operations respect OpenStack's authentication, authorization, and project scoping mechanisms.

The API automatically converts legacy `sort_key`/`sort_dir` parameters to the modern `sort` syntax that OpenStack Glance expects, ensuring compatibility with different OpenStack deployments.
