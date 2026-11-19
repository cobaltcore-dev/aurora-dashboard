import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"
import { KUBERNETES_LANDSCAPE_KEYS, type KubernetesLandscape } from "@/types/kubernetes"

export const kubernetesLandscapeSchema = z.enum(KUBERNETES_LANDSCAPE_KEYS)

export const gardenerInfoInputSchema = projectScopedInputSchema.extend({ landscape: kubernetesLandscapeSchema })

/** Loose on purpose: extra ConfigMap fields are ignored. */
export const gardenerInfoConfigMapSchema = z.object({ data: z.record(z.string(), z.string()).nullish() })

/** Reads the top-level `version:` line of the `gardenerAPIServer` YAML string without a YAML dependency. */
export function parseGardenerApiServerVersion(yamlText: string | undefined): string | null {
  if (!yamlText) return null
  const match = /^version:\s*["']?([^\s"'#]+)/m.exec(yamlText)
  return match?.[1] ?? null
}

export type GardenerInfo = { landscape: KubernetesLandscape; version: string | null }
