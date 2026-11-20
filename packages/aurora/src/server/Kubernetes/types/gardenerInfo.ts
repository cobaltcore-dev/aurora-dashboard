import { z } from "zod"
import { type KubernetesLandscape } from "@/types/kubernetes"
import { kubernetesLandscapeSchema, kubernetesInputSchema } from "./common"

// Re-export for backward compatibility
export { kubernetesLandscapeSchema }

export const gardenerInfoInputSchema = kubernetesInputSchema

/** Loose on purpose: extra ConfigMap fields are ignored. */
export const configMapSchema = z.object({ data: z.record(z.string(), z.string()).nullish() })

// Alias for backward compatibility
export const gardenerInfoConfigMapSchema = configMapSchema

/** Reads the top-level `version:` line of the `gardenerAPIServer` YAML string without a YAML dependency. */
export function parseGardenerApiServerVersion(yamlText: string | undefined): string | null {
  if (!yamlText) return null
  const match = /^version:\s*["']?([^\s"'#]+)/m.exec(yamlText)
  return match?.[1] ?? null
}

export type GardenerInfo = { landscape: KubernetesLandscape; version: string | null }
