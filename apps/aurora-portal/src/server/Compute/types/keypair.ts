import { z } from "zod"

export const keypairSchema = z.object({
  name: z.string(),
  public_key: z.string().optional(),
  fingerprint: z.string().optional(),
  type: z
    .union([
      z.literal("ssh"),
      z.literal("x509"),
      z.string(), // fallback for future types
    ])
    .optional(),
  user_id: z.string().optional().nullable(),
  created_at: z.string().optional(),
  deleted: z.boolean().optional(),
  deleted_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  id: z.number().optional(),
  private_key: z.string().optional().nullable(), // Only present when generating a new key
})

export const keypairResponseSchema = z.object({
  keypair: keypairSchema,
})

export const keypairsResponseSchema = z.object({
  keypairs: z.array(
    z.object({
      keypair: keypairSchema,
    })
  ),
})

// Schema for creating a new keypair
export const createKeypairSchema = z.object({
  keypair: z.object({
    name: z.string(),
    public_key: z.string().optional(), // Optional if generating a new key
    type: z.union([z.literal("ssh"), z.literal("x509"), z.string()]).optional(),
    user_id: z.string().optional(),
  }),
})

export type Keypair = z.infer<typeof keypairSchema>
export type KeypairResponse = z.infer<typeof keypairResponseSchema>
export type KeypairsResponse = z.infer<typeof keypairsResponseSchema>
export type CreateKeypair = z.infer<typeof createKeypairSchema>
