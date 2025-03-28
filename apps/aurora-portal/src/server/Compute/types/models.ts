import { z } from "zod"

const linkSchema = z.object({
  href: z.string().url().nullable().optional(),
  rel: z.string().nullable().optional(),
})

export const serverSchema = z.object({
  accessIPv4: z.string().optional().nullable(),
  accessIPv6: z.string().optional().nullable(),
  addresses: z
    .object({
      private: z.array(
        z.object({
          addr: z.string().optional(),
          mac_addr: z.string().optional(),
          type: z.string().optional(),
          version: z.number().optional(),
        })
      ),
    })
    .optional(),
  created: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  flavor: z
    .object({
      disk: z.number().optional(),
      ephemeral: z.number().optional(),
      extra_specs: z.record(z.any()).optional(),
      original_name: z.string().optional(),
      ram: z.number().optional(),
      swap: z.number().optional(),
      vcpus: z.number().optional(),
    })
    .optional(),
  hostId: z.string().optional(),
  host_status: z
    .union([z.literal("UP"), z.literal("DOWN"), z.literal("UNKNOWN"), z.literal("MAINTENANCE"), z.literal("")])
    .optional(),
  id: z.string(),
  image: z
    .object({
      id: z.string().optional().nullable(),
      links: z.array(linkSchema).optional(),
      properties: z.record(z.unknown()).optional(),
    })
    .optional(),
  key_name: z.string().optional().nullable(),
  links: z.array(linkSchema).optional(),
  locked: z.boolean().optional(),
  locked_reason: z.string().optional().nullable(),
  metadata: z.record(z.string()).optional(),
  name: z.string().optional().nullable(),
  "OS-DCF:diskConfig": z.union([z.literal("AUTO"), z.literal("MANUAL")]).optional(),
  "OS-EXT-AZ:availability_zone": z.string().optional().nullable(),
  "OS-EXT-SRV-ATTR:host": z.string().optional().nullable(),
  "OS-EXT-SRV-ATTR:hostname": z.string().optional().nullable(),
  "OS-EXT-SRV-ATTR:hypervisor_hostname": z.string().optional().nullable(),
  "OS-EXT-SRV-ATTR:instance_name": z.string().optional().nullable(),
  "OS-EXT-SRV-ATTR:kernel_id": z.string().optional().nullable(),
  "OS-EXT-SRV-ATTR:launch_index": z.number().optional(),
  "OS-EXT-SRV-ATTR:ramdisk_id": z.string().optional().nullable(),
  "OS-EXT-SRV-ATTR:reservation_id": z.string().optional().nullable(),
  "OS-EXT-SRV-ATTR:root_device_name": z.string().optional().nullable(),
  "OS-EXT-SRV-ATTR:user_data": z.string().optional().nullable(),
  "OS-EXT-STS:power_state": z.number().optional(),
  "OS-EXT-STS:task_state": z.string().optional().nullable(),
  "OS-EXT-STS:vm_state": z.string().optional().nullable(),
  progress: z.number().optional(),
  status: z
    .union([
      z.literal("ACTIVE"),
      z.literal("BUILD"),
      z.literal("DELETED"),
      z.literal("ERROR"),
      z.literal("HARD_REBOOT"),
      z.literal("MIGRATING"),
      z.literal("PASSWORD"),
      z.literal("PAUSED"),
      z.literal("REBOOT"),
      z.literal("REBUILD"),
      z.literal("RESCUE"),
      z.literal("RESIZE"),
      z.literal("REVERT_RESIZE"),
      z.literal("SHELVED"),
      z.literal("SHELVED_OFFLOADED"),
      z.literal("SOFT_DELETED"),
      z.literal("SUSPENDED"),
      z.literal("UNKNOWN"),
      z.literal("VERIFY_RESIZE"),
      z.string(),
    ])
    .optional(),
  tags: z.array(z.string()).optional(),
  tenant_id: z.string().optional().nullable(),
  updated: z.string().optional().nullable(),
  OS_EXT_SRV_ATTR_host: z.string().optional(),
  OS_EXT_STS_task_state: z.string().optional(),
  OS_EXT_STS_vm_state: z.string().optional(),
})

export const serverResponseSchema = z.object({
  servers: z.array(serverSchema),
})

export type Server = z.infer<typeof serverSchema>
