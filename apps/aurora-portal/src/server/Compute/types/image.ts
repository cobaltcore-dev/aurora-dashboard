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
})

export const imageResponseSchema = z.object({
  images: z.array(imageSchema),
})

export const imageDetailResponseSchema = z.object({
  image: imageSchema,
})

export type GlanceImage = z.infer<typeof imageSchema>
