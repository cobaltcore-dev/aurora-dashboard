import { z } from "zod"

export const ssarResponseSchema = z
  .object({
    status: z
      .object({
        allowed: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export type KubernetesPermissions = {
  clusters: {
    list: boolean
    get: boolean
    create: boolean
    update: boolean
    delete: boolean
  }
  clustersAdminKubeconfig: boolean
}
