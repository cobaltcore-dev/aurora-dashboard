import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"
import { KUBERNETES_LANDSCAPE_KEYS } from "@/types/kubernetes"

export const kubernetesLandscapeSchema = z.enum(KUBERNETES_LANDSCAPE_KEYS)

export const kubernetesInputSchema = projectScopedInputSchema.extend({ landscape: kubernetesLandscapeSchema })

export const clusterNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/)

export const clusterInputSchema = kubernetesInputSchema.extend({ name: clusterNameSchema })
