import { z } from "zod"

export const SecretSchema = z.object({
  secret_ref: z.string(),
  name: z.string().nullable(),
  status: z.string(),
  algorithm: z.string().nullable(),
  bit_length: z.number().nullable(),
  mode: z.string().nullable(),
  secret_type: z.string(),
  content_types: z.record(z.string(), z.string()).nullable().optional(),
  created: z.string(),
  updated: z.string(),
  expiration: z.string().nullable(),
  creator_id: z.string().nullable().optional(),
})

export const ContainerSchema = z.object({
  container_ref: z.string(),
  name: z.string().nullable(),
  type: z.enum(["generic", "rsa", "certificate"]),
  status: z.string(),
  created: z.string(),
  updated: z.string(),
  secret_refs: z.array(z.object({ name: z.string().nullable(), secret_ref: z.string() })),
  consumers: z.array(z.unknown()).optional(),
})

export const OrderSchema = z.object({
  order_ref: z.string(),
  type: z.string(),
  status: z.string(),
  sub_status: z.string().nullable().optional(),
  sub_status_message: z.string().nullable().optional(),
  created: z.string(),
  updated: z.string(),
  secret_ref: z.string().nullable().optional(),
  meta: z.record(z.string(), z.unknown()),
  creator_id: z.string().nullable().optional(),
})

export const SecretsListSchema = z.object({
  total: z.number(),
  secrets: z.array(SecretSchema),
  next: z.string().optional(),
  previous: z.string().optional(),
})

export const ContainersListSchema = z.object({
  total: z.number(),
  containers: z.array(ContainerSchema),
  next: z.string().optional(),
  previous: z.string().optional(),
})

export const OrdersListSchema = z.object({
  total: z.number(),
  orders: z.array(OrderSchema),
  next: z.string().optional(),
  previous: z.string().optional(),
})

export const CreateSecretInputSchema = z.object({
  name: z.string().optional(),
  secret_type: z.string().default("opaque"),
  algorithm: z.string().optional(),
  bit_length: z.number().optional(),
  mode: z.string().optional(),
  payload: z.string().optional(),
  payload_content_type: z.string().optional(),
  payload_content_encoding: z.string().optional(),
  expiration: z.string().optional(),
})

export const UpdateSecretInputSchema = z.object({
  secretId: z.string(),
  payload: z.string(),
  payload_content_type: z.string().default("text/plain"),
})

export const CreateContainerInputSchema = z.object({
  name: z.string().optional(),
  type: z.enum(["generic", "rsa", "certificate"]),
  secret_refs: z
    .array(z.object({ name: z.string(), secret_ref: z.string() }))
    .optional()
    .default([]),
})

export const CreateOrderInputSchema = z.object({
  type: z.enum(["key", "asymmetric", "certificate"]),
  meta: z.record(z.string(), z.unknown()),
})

export type Secret = z.infer<typeof SecretSchema>
export type Container = z.infer<typeof ContainerSchema>
export type Order = z.infer<typeof OrderSchema>
