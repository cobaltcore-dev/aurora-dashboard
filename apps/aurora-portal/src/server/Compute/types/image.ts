import { z } from "zod"

const linkSchema = z.object({
  href: z.string().url().nullable().optional(),
  rel: z.string().nullable().optional(),
})

export const imageSchema = z.object({
  id: z.string(),
  name: z.string().optional().nullable(),
  status: z
    .union([
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
    .optional(),
  visibility: z
    .union([
      z.literal("public"),
      z.literal("private"),
      z.literal("shared"),
      z.literal("community"),
      z.string(), // fallback
    ])
    .optional(),
  protected: z.boolean().optional(),
  checksum: z.string().optional().nullable(),
  container_format: z
    .union([
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
    .optional()
    .nullable(),
  disk_format: z
    .union([
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
    .optional()
    .nullable(),
  min_ram: z.number().optional(),
  min_disk: z.number().optional(),
  size: z.number().optional(),
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
  os_type: z
    .union([
      z.literal("linux"),
      z.literal("windows"),
      z.string(), // fallback
    ])
    .optional()
    .nullable(),
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

// Input schema for listing images with sorting and filtering
export const listImagesInputSchema = z.object({
  projectId: z.string(),

  // Sorting parameters
  sort_key: sortKeySchema.optional().default("created_at"),
  sort_dir: sortDirSchema.optional().default("desc"),
  sort: z.string().optional(), // Alternative sort syntax: "name:asc,status:desc"

  // Pagination parameters
  limit: z.number().min(1).max(1000).optional(),
  marker: z.string().optional(),

  // Basic filtering parameters
  name: z.string().optional(),
  status: z
    .enum([
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
    .optional(),
  visibility: z.enum(["public", "private", "shared", "community", "all"]).optional(),
  owner: z.string().optional(),
  protected: z.boolean().optional(),

  // Format filtering
  container_format: z.enum(["bare", "ovf", "ova", "docker", "ami", "ari", "aki", "compressed"]).optional(),
  disk_format: z.enum(["ami", "ari", "aki", "vhd", "vhdx", "vmdk", "raw", "qcow2", "vdi", "iso", "ploop"]).optional(),

  // Size filtering (in bytes)
  size_min: z.number().optional(),
  size_max: z.number().optional(),

  // RAM and disk requirements
  min_ram: z.number().optional(),
  min_disk: z.number().optional(),

  // Tag filtering
  tag: z.string().optional(), // Can be used multiple times in actual query

  // OS properties
  os_type: z.enum(["linux", "windows"]).optional(),
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
export const getImageByIdInputSchema = z.object({
  projectId: z.string(),
  imageId: z.string().uuid(), // UUID validation for image ID
})

// Input schema for creating an image
export const createImageInputSchema = z
  .object({
    projectId: z.string(),
    // Core properties that can be set during creation
    name: z.string().optional(),
    id: z.string().uuid().optional(), // Optional UUID, API will generate if omitted
    container_format: z
      .union([
        z.literal("bare"),
        z.literal("ovf"),
        z.literal("ova"),
        z.literal("docker"),
        z.literal("ami"),
        z.literal("ari"),
        z.literal("aki"),
        z.literal("compressed"),
      ])
      .optional(),
    disk_format: z
      .union([
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
      ])
      .optional(),
    visibility: z
      .union([z.literal("public"), z.literal("private"), z.literal("shared"), z.literal("community")])
      .optional()
      .default("private"),
    protected: z.boolean().optional().default(false),
    min_ram: z.number().int().nonnegative().optional().default(0),
    min_disk: z.number().int().nonnegative().optional().default(0),
    tags: z.array(z.string().max(255)).optional().default([]),
    // Additional properties - can include any string key-value pairs
    // Following OpenStack property naming conventions
    os_type: z.union([z.literal("linux"), z.literal("windows")]).optional(),
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

// Input schema for deleting an image
export const deleteImageInputSchema = z.object({
  projectId: z.string(),
  imageId: z.string().uuid(), // UUID validation for image ID
})

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

export type GlanceImage = z.infer<typeof imageSchema>
export type GetImageByIdInput = z.infer<typeof getImageByIdInputSchema>
export type CreateImageInput = z.infer<typeof createImageInputSchema>
export type DeleteImageInput = z.infer<typeof deleteImageInputSchema>
export type ListImagesInput = z.infer<typeof listImagesInputSchema>
export type ImagesPaginatedInput = z.infer<typeof imagesPaginatedInputSchema>
export type SortKey = z.infer<typeof sortKeySchema>
export type SortDir = z.infer<typeof sortDirSchema>
export type ImagesPaginatedResponse = z.infer<typeof imagesPaginatedResponseSchema>
