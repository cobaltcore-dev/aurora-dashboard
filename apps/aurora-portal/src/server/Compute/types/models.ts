import { z } from "zod"

export const serverSchema = z.object({
  id: z.string(),
  name: z.string(),
  accessIPv4: z.string(),
  accessIPv6: z.string(),
  addresses: z.object({
    private: z.array(
      z.object({
        addr: z.string(),
        mac_addr: z.string().optional(),
        type: z.string().optional(),
        version: z.number().optional(),
      })
    ),
  }),
  created: z.string(),
  updated: z.string(),
  status: z.union([z.literal("ACTIVE"), z.literal("SHUTOFF")]),
  flavor: z.object({
    disk: z.number(),
    ram: z.number(),
    vcpus: z.number(),
  }),
  image: z.object({
    id: z.string(),
  }),
  metadata: z.record(z.string()),
})

export type Server = z.infer<typeof serverSchema>
