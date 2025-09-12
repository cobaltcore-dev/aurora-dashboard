# Image Service BFF API Documentation

This document describes the Backend for Frontend (BFF) endpoints for the Image Service, which provides a TypeScript interface to the OpenStack Glance Image Service API v2.

## Base Configuration

All endpoints are protected procedures that require authentication and operate within a specific OpenStack project context.

### Common Parameters

- `projectId` (string): Required for all operations. The OpenStack project ID to scope the operation to.

## Image Management Endpoints

### List Images

Retrieves a list of images with optional filtering and sorting.

**Endpoint:** `listImages`  
**Method:** Query  
**Input Schema:** `listImagesInputSchema`

#### Parameters

| Parameter          | Type    | Description                                                              | Default      |
| ------------------ | ------- | ------------------------------------------------------------------------ | ------------ |
| `projectId`        | string  | OpenStack project ID                                                     | Required     |
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
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  sort: "name:asc",
  status: "active",
  visibility: "private",
  limit: 10,
})

// Multi-field sorting
const imagesMultiSort = await client.compute.image.listImages.query({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  sort: "status:asc,name:asc,created_at:desc",
  visibility: "public",
})

// Using legacy syntax (still supported)
const imagesLegacy = await client.compute.image.listImages.query({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  sort_key: "name",
  sort_dir: "asc",
  status: "active",
})

// Filtering examples
const filteredImages = await client.compute.image.listImages.query({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  sort: "name:asc",
  limit: 25,
  visibility: "public",
})

// Using next page URL
const nextPage = await client.compute.image.listImagesWithPagination.query({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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

| Parameter   | Type          | Description          |
| ----------- | ------------- | -------------------- |
| `projectId` | string        | OpenStack project ID |
| `imageId`   | string (UUID) | Image UUID           |

#### Example Request

```typescript
const image = await client.compute.image.getImageById.query({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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
| `projectId`        | string        | OpenStack project ID                    | Required  |
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
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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

Uploads binary data to an existing image.

**Endpoint:** `uploadImage`  
**Method:** Mutation  
**Input Schema:** `uploadImageInputSchema`

#### Parameters

| Parameter     | Type                                | Description                  | Default                    |
| ------------- | ----------------------------------- | ---------------------------- | -------------------------- |
| `projectId`   | string                              | OpenStack project ID         | Required                   |
| `imageId`     | string (UUID)                       | Target image UUID            | Required                   |
| `imageData`   | ArrayBuffer \| Uint8Array \| string | Binary data or base64 string | Required                   |
| `contentType` | string                              | MIME type                    | `application/octet-stream` |

#### Example Request

```typescript
// Upload from file
const fileData = await file.arrayBuffer()
const success = await client.compute.image.uploadImage.mutate({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
  imageData: fileData,
  contentType: "application/octet-stream",
})

// Upload from base64
const success = await client.compute.image.uploadImage.mutate({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
  imageData: base64String,
  contentType: "image/qcow2",
})
```

#### Response

Returns `boolean` - `true` on success, `false` on failure.

#### Error Handling

- **404**: Image not found
- **403**: Access forbidden
- **409**: Image not in valid state (must be `queued`)
- **400**: Invalid data or headers
- **413**: Image data too large
- **415**: Unsupported content type

---

### Update Image

Updates image metadata using JSON Patch operations.

**Endpoint:** `updateImage`  
**Method:** Mutation  
**Input Schema:** `updateImageInputSchema`

#### Parameters

| Parameter    | Type                 | Description                    |
| ------------ | -------------------- | ------------------------------ |
| `projectId`  | string               | OpenStack project ID           |
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
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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
| `projectId`  | string        | OpenStack project ID                                        |
| `imageId`    | string (UUID) | Image UUID                                                  |
| `visibility` | enum          | New visibility (`public`, `private`, `shared`, `community`) |

#### Example Request

```typescript
const updatedImage = await client.compute.image.updateImageVisibility.mutate({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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

| Parameter   | Type          | Description          |
| ----------- | ------------- | -------------------- |
| `projectId` | string        | OpenStack project ID |
| `imageId`   | string (UUID) | Image UUID           |

#### Example Request

```typescript
const success = await client.compute.image.deleteImage.mutate({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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

| Parameter   | Type          | Description          |
| ----------- | ------------- | -------------------- |
| `projectId` | string        | OpenStack project ID |
| `imageId`   | string (UUID) | Image UUID           |

#### Example Request

```typescript
const members = await client.compute.image.listImageMembers.query({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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

| Parameter   | Type          | Description          |
| ----------- | ------------- | -------------------- |
| `projectId` | string        | OpenStack project ID |
| `imageId`   | string (UUID) | Image UUID           |
| `memberId`  | string        | Member project ID    |

#### Example Request

```typescript
const member = await client.compute.image.getImageMember.query({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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

| Parameter   | Type          | Description                 |
| ----------- | ------------- | --------------------------- |
| `projectId` | string        | OpenStack project ID        |
| `imageId`   | string (UUID) | Image UUID                  |
| `member`    | string        | Project ID to add as member |

#### Example Request

```typescript
const newMember = await client.compute.image.createImageMember.mutate({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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

| Parameter   | Type          | Description                                    |
| ----------- | ------------- | ---------------------------------------------- |
| `projectId` | string        | OpenStack project ID                           |
| `imageId`   | string (UUID) | Image UUID                                     |
| `memberId`  | string        | Member project ID                              |
| `status`    | enum          | New status (`pending`, `accepted`, `rejected`) |

#### Example Request

```typescript
const updatedMember = await client.compute.image.updateImageMember.mutate({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
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

| Parameter   | Type          | Description          |
| ----------- | ------------- | -------------------- |
| `projectId` | string        | OpenStack project ID |
| `imageId`   | string (UUID) | Image UUID           |
| `memberId`  | string        | Member project ID    |

#### Example Request

```typescript
const success = await client.compute.image.deleteImageMember.mutate({
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  imageId: "a85abd86-55b3-4413-a5b7-6cd8a6bd99ac",
  memberId: "660e8400-e29b-41d4-a716-446655440001",
})
```

#### Response

Returns `boolean` - `true` on success, `false` on failure.

#### Error Handling

- **404**: Image or member not found
- **403**: Access forbidden (must be image owner)

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