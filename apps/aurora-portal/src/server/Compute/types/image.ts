import { z } from "zod"

// Common base schemas
const linkSchema = z.object({
  href: z.string().url().nullable().optional(),
  rel: z.string().nullable().optional(),
})

const baseImageInputSchema = z.object({
  imageId: z.string().uuid(),
})

// Enum schemas
const imageStatusSchema = z.union([
  z.literal("queued"),
  z.literal("saving"),
  z.literal("active"),
  z.literal("killed"),
  z.literal("deleted"),
  z.literal("pending_delete"),
  z.literal("deactivated"),
  z.literal("importing"),
  z.string(), // fallback for any unexpected values
])

const imageVisibilitySchema = z.union([
  z.literal("public"),
  z.literal("private"),
  z.literal("shared"),
  z.literal("community"),
  z.string(), // fallback
])

const containerFormatSchema = z.union([
  z.literal("bare"),
  z.literal("ovf"),
  z.literal("ova"),
  z.literal("docker"),
  z.literal("ami"),
  z.literal("ari"),
  z.literal("aki"),
  z.literal("compressed"),
  z.string(), // fallback
])

const diskFormatSchema = z.union([
  z.literal("ami"),
  z.literal("ari"),
  z.literal("aki"),
  z.literal("vhd"),
  z.literal("vhdx"),
  z.literal("vmdk"),
  z.literal("raw"),
  z.literal("qcow2"),
  z.literal("vdi"),
  z.literal("iso"),
  z.literal("ploop"),
  z.string(), // fallback
])

const osTypeSchema = z.union([
  z.literal("linux"),
  z.literal("windows"),
  z.string(), // fallback
])

// Main image schema
export const imageSchema = z
  .object({
    id: z.string(),
    name: z.string().optional().nullable(),
    status: imageStatusSchema.optional(),
    visibility: imageVisibilitySchema.optional(),
    protected: z.boolean().optional(),
    checksum: z.string().optional().nullable(),
    container_format: containerFormatSchema.optional().nullable(),
    disk_format: diskFormatSchema.optional().nullable(),
    min_ram: z.number().optional(),
    min_disk: z.number().optional(),
    size: z.number().optional().nullable(),
    virtual_size: z.number().optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    deleted_at: z.string().optional().nullable(),
    owner: z.string().optional().nullable(),
    os_hidden: z.boolean().optional(),
    os_hash_algo: z.string().optional().nullable(),
    os_hash_value: z.string().optional().nullable(),
    schema: z.string().optional(),
    metadata: z.record(z.string()).optional(),
    file: z.string().optional(),
    self: z.string().optional(),
    tags: z.array(z.string()).optional(),
    direct_url: z.string().optional().nullable(),
    hw_disk_bus: z.string().optional().nullable(),
    hw_scsi_model: z.string().optional().nullable(),
    hw_serial: z.string().optional().nullable(),
    hw_qemu_guest_agent: z.boolean().optional(),
    hw_vif_model: z.string().optional().nullable(),
    hw_rng_model: z.string().optional().nullable(),
    hw_machine_type: z.string().optional().nullable(),
    os_type: osTypeSchema.optional().nullable(),
    os_distro: z.string().optional().nullable(),
    os_version: z.string().optional().nullable(),
    os_require_quiesce: z.boolean().optional(),
    links: z.array(linkSchema).optional(),
    members: z.array(z.string()).optional(),
    locations: z
      .array(
        z.object({
          url: z.string(),
          metadata: z.record(z.any()).optional(),
        })
      )
      .optional(),
  })
  .passthrough() // Allow custom metadata properties not defined in schema

// Image Member Schemas
export const memberStatusSchema = z.enum(["pending", "accepted", "rejected"])

export const imageMemberSchema = z.object({
  member_id: z.string(),
  image_id: z.string().uuid(),
  status: memberStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  schema: z.string().optional(),
})

// Image member input schemas
const baseMemberInputSchema = baseImageInputSchema.extend({
  memberId: z.string(), // tenant/project ID of the member
})

export const listImageMembersInputSchema = baseImageInputSchema
export const getImageMemberInputSchema = baseMemberInputSchema

export const createImageMemberInputSchema = baseImageInputSchema.extend({
  member: z.string(), // tenant/project ID to add as member
})

export const updateImageMemberInputSchema = baseMemberInputSchema.extend({
  status: memberStatusSchema,
})

export const deleteImageMemberInputSchema = baseMemberInputSchema

// Response schemas for image members
export const imageMembersResponseSchema = z.object({
  members: z.array(imageMemberSchema),
})

// Define valid sort keys based on OpenStack Glance API v2
export const sortKeySchema = z.enum([
  "name",
  "status",
  "container_format",
  "disk_format",
  "size",
  "id",
  "created_at",
  "updated_at",
  "min_disk",
  "min_ram",
  "owner",
  "protected",
  "visibility",
])

export const sortDirSchema = z.enum(["asc", "desc"])

// Define image visibility values for filtering (includes 'all')
const imageVisibilityFilterSchema = z.enum(["public", "private", "shared", "community", "all"])

// Export the visibility schema without 'all' for actual image properties
export const imageVisibilityEnumSchema = z.enum(["public", "private", "shared", "community"])

// Enum schemas for filtering
const statusFilterSchema = z.enum([
  "queued",
  "saving",
  "active",
  "killed",
  "deleted",
  "pending_delete",
  "deactivated",
  "uploading",
  "importing",
])

const containerFormatFilterSchema = z.enum(["bare", "ovf", "ova", "docker", "ami", "ari", "aki", "compressed"])

const diskFormatFilterSchema = z.enum([
  "ami",
  "ari",
  "aki",
  "vhd",
  "vhdx",
  "vmdk",
  "raw",
  "qcow2",
  "vdi",
  "iso",
  "ploop",
])

const osTypeFilterSchema = z.enum(["linux", "windows"])

// Helper to allow single value or 'in:' operator string for multi-value filters
const multiValueFilter = <T extends z.ZodTypeAny>(enumSchema: T) =>
  z.union([
    enumSchema, // Single value: "active"
    z.string(), // 'in:' operator: "in:active,queued"
  ])

// Input schema for listing images with sorting and filtering
export const listImagesInputSchema = z.object({
  // Sorting parameters
  sort_key: sortKeySchema.optional(),
  sort_dir: sortDirSchema.optional(),
  sort: z.string().optional(), // Alternative sort syntax: "name:asc,status:desc"

  // Pagination parameters
  limit: z.number().min(1).max(1000).optional(),
  marker: z.string().optional(),

  // Basic filtering parameters
  name: z.string().optional(),
  // Multi-value filter support for status
  status: multiValueFilter(statusFilterSchema).optional(),
  visibility: imageVisibilityFilterSchema.optional(), // Single-value only
  owner: z.string().optional(),
  protected: z.boolean().optional(),

  // Format filtering with multi-value support
  container_format: multiValueFilter(containerFormatFilterSchema).optional(),
  disk_format: multiValueFilter(diskFormatFilterSchema).optional(),

  // Size filtering (in bytes)
  size_min: z.number().optional(),
  size_max: z.number().optional(),

  // RAM and disk requirements
  min_ram: z.number().optional(),
  min_disk: z.number().optional(),

  // Tag filtering
  tag: z.string().optional(), // Can be used multiple times in actual query

  // OS properties
  os_type: osTypeFilterSchema.optional(),
  os_hidden: z.boolean().optional(),

  // Member status for shared images
  member_status: z.enum(["pending", "accepted", "rejected", "all"]).optional(),

  // Time-based filtering with comparison operators
  created_at: z.string().optional(), // Format: "operator:ISO8601_time" e.g., "gte:2016-04-18T21:38:54Z"
  updated_at: z.string().optional(), // Format: "operator:ISO8601_time" e.g., "gte:2016-04-18T21:38:54Z"
})

export const imagesPaginatedInputSchema = listImagesInputSchema.extend({
  first: z.string().optional(), // URL for the first page
  next: z.string().optional(), // URL for the next page (only present if more pages exist)
})

// Input schema for getting a single image by ID
export const getImageByIdInputSchema = baseImageInputSchema

// Input schema for creating an image
export const createImageInputSchema = z
  .object({
    // Core properties that can be set during creation
    name: z.string().optional(),
    id: z.string().uuid().optional(), // Optional UUID, API will generate if omitted
    container_format: containerFormatSchema.optional(),
    disk_format: diskFormatSchema.optional(),
    visibility: imageVisibilityEnumSchema.optional().default("private"),
    protected: z.boolean().optional().default(false),
    min_ram: z.number().int().nonnegative().optional().default(0),
    min_disk: z.number().int().nonnegative().optional().default(0),
    tags: z.array(z.string().max(255)).optional().default([]),
    // Additional properties - can include any string key-value pairs
    // Following OpenStack property naming conventions
    os_type: osTypeFilterSchema.optional(),
    os_distro: z.string().optional(),
    os_version: z.string().optional(),
    architecture: z.string().optional(),
    os_hidden: z.boolean().optional().default(false),
    // Hardware properties
    hw_disk_bus: z.string().optional(),
    hw_scsi_model: z.string().optional(),
    hw_serial: z.string().optional(),
    hw_qemu_guest_agent: z.boolean().optional(),
    hw_vif_model: z.string().optional(),
    hw_rng_model: z.string().optional(),
    hw_machine_type: z.string().optional(),
    // Allow additional custom properties as strings
  })
  .catchall(z.string())

// Input schema for uploading image data to an existing image
export const uploadImageInputSchema = baseImageInputSchema.extend({
  imageData: z.instanceof(ArrayBuffer).or(z.instanceof(Uint8Array)).or(z.string()), // Binary data or base64 string
  contentType: z.string().optional().default("application/octet-stream"), // MIME type of the image data
})

// JSON Patch operation schema for updating images
const jsonPatchOperationSchema = z.object({
  op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
  path: z.string(), // JSON Pointer path like "/name", "/tags", "/visibility"
  value: z.any().optional(), // Value is optional for "remove" operation
  from: z.string().optional(), // Required for "move" and "copy" operations
})

// Input schema for updating an image using JSON Patch format
export const updateImageInputSchema = baseImageInputSchema.extend({
  operations: z.array(jsonPatchOperationSchema).min(1), // Array of JSON Patch operations
})

// Input schema for updating image visibility specifically
export const updateImageVisibilityInputSchema = baseImageInputSchema.extend({
  visibility: imageVisibilityEnumSchema, // New visibility value
})

// Simplified schemas using the base schema - these all have the same structure
export const deleteImageInputSchema = baseImageInputSchema
export const deactivateImageInputSchema = baseImageInputSchema
export const reactivateImageInputSchema = baseImageInputSchema

// Bulk operation input schemas
export const deleteImagesInputSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1, "At least one image ID is required"),
})

export const activateImagesInputSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1, "At least one image ID is required"),
})

export const deactivateImagesInputSchema = z.object({
  imageIds: z.array(z.string().uuid()).min(1, "At least one image ID is required"),
})

// Bulk operation result schema
export const bulkOperationResultSchema = z.object({
  successful: z.array(z.string()),
  failed: z.array(
    z.object({
      imageId: z.string(),
      error: z.string(),
    })
  ),
})

// Response schemas
export const imageResponseSchema = z.object({
  images: z.array(imageSchema),
})

export const imageDetailResponseSchema = z.object({
  image: imageSchema,
})

// Schema for paginated images response (includes pagination links)
export const imagesPaginatedResponseSchema = z.object({
  images: z.array(imageSchema),
  first: z.string().optional(), // URL for the first page
  next: z.string().optional(), // URL for the next page (only present if more pages exist)
  schema: z.string().optional(), // URL for the schema describing the images list
})

// Type exports
export type GlanceImage = z.infer<typeof imageSchema>
export type ImageMember = z.infer<typeof imageMemberSchema>
export type MemberStatus = z.infer<typeof memberStatusSchema>
export type ListImageMembersInput = z.infer<typeof listImageMembersInputSchema>
export type GetImageMemberInput = z.infer<typeof getImageMemberInputSchema>
export type CreateImageMemberInput = z.infer<typeof createImageMemberInputSchema>
export type UpdateImageMemberInput = z.infer<typeof updateImageMemberInputSchema>
export type DeleteImageMemberInput = z.infer<typeof deleteImageMemberInputSchema>
export type ImageMembersResponse = z.infer<typeof imageMembersResponseSchema>
export type GetImageByIdInput = z.infer<typeof getImageByIdInputSchema>
export type CreateImageInput = z.infer<typeof createImageInputSchema>
export type UploadImageInput = z.infer<typeof uploadImageInputSchema>
export type UpdateImageInput = z.infer<typeof updateImageInputSchema>
export type UpdateImageVisibilityInput = z.infer<typeof updateImageVisibilityInputSchema>
export type DeleteImageInput = z.infer<typeof deleteImageInputSchema>
export type DeactivateImageInput = z.infer<typeof deactivateImageInputSchema>
export type ReactivateImageInput = z.infer<typeof reactivateImageInputSchema>
export type ListImagesInput = z.infer<typeof listImagesInputSchema>
export type ImagesPaginatedInput = z.infer<typeof imagesPaginatedInputSchema>
export type SortKey = z.infer<typeof sortKeySchema>
export type SortDir = z.infer<typeof sortDirSchema>
export type ImageVisibility = z.infer<typeof imageVisibilityEnumSchema>
export type ImagesPaginatedResponse = z.infer<typeof imagesPaginatedResponseSchema>
export type DeleteImagesInput = z.infer<typeof deleteImagesInputSchema>
export type ActivateImagesInput = z.infer<typeof activateImagesInputSchema>
export type DeactivateImagesInput = z.infer<typeof deactivateImagesInputSchema>
export type BulkOperationResult = z.infer<typeof bulkOperationResultSchema>
