/**
 * Gardener/Persephone landscapes and the service-catalog entry that exposes each one.
 * Mirrors Elektra's `plugins/kubernetes_ng/lib/kubernetes_ng.rb`.
 */
export const KUBERNETES_LANDSCAPES = {
  qa: { service: "persephone-qa" },
  canary: { service: "persephone-canary" },
  prod: { service: "persephone-prod" },
} as const

export const KUBERNETES_LANDSCAPE_KEYS = ["qa", "canary", "prod"] as const
export type KubernetesLandscape = (typeof KUBERNETES_LANDSCAPE_KEYS)[number]

/** Returns the first catalog entry whose type or name is the landscape's service, matching signal-openstack. */
export function findLandscapeService<T extends { type: string; name: string }>(
  services: T[],
  landscape: KubernetesLandscape
): T | undefined {
  const serviceName: string = KUBERNETES_LANDSCAPES[landscape].service
  return services.find((entry) => entry.type === serviceName || entry.name === serviceName)
}
