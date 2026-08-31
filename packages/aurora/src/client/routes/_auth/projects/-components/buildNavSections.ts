import { getServiceIndex } from "@/server/Authentication/helpers"
import { t } from "@lingui/core/macro"
import type { NavigateFn } from "@tanstack/react-router"
import type { ServiceExtension } from "@/client/AuroraApp"

export type NavItem = {
  service: string
  label: string
  navigate: (navigateFn: NavigateFn) => void
  params: Record<string, string>
}

export type NavSection = {
  section: string
  label: string
  services: NavItem[]
}

export function buildNavSections(
  projectId: string,
  availableServices: { type: string; name: string }[],
  enabledServices?: string[],
  serviceExtensions?: ServiceExtension[]
): NavSection[] {
  const serviceIndex = getServiceIndex(availableServices)
  const isEnabled = (service: string) => !enabledServices || enabledServices.includes(service)

  const computeServices: NavItem[] = [
    ...(serviceIndex["image"]?.["glance"] && isEnabled("images")
      ? [
          {
            service: "images",
            label: t`Images`,
            navigate: (nav: NavigateFn) => nav({ to: "/projects/$projectId/compute/images", params: { projectId } }),
            params: { projectId },
          },
        ]
      : []),
    ...(serviceIndex?.["compute"]?.["nova"] && isEnabled("flavors")
      ? [
          {
            service: "flavors",
            label: t`Flavors`,
            navigate: (nav: NavigateFn) => nav({ to: "/projects/$projectId/compute/flavors", params: { projectId } }),
            params: { projectId },
          },
        ]
      : []),
  ]

  const networkServices: NavItem[] = serviceIndex["network"]
    ? [
        ...(isEnabled("securitygroups")
          ? [
              {
                service: "securitygroups",
                label: t`Security Groups`,
                navigate: (nav: NavigateFn) =>
                  nav({ to: "/projects/$projectId/network/securitygroups", params: { projectId } }),
                params: { projectId },
              },
            ]
          : []),
        ...(isEnabled("floatingips")
          ? [
              {
                service: "floatingips",
                label: t`Floating IPs`,
                navigate: (nav: NavigateFn) =>
                  nav({ to: "/projects/$projectId/network/floatingips", params: { projectId } }),
                params: { projectId },
              },
            ]
          : []),
      ]
    : []

  const storageServices: NavItem[] = [
    ...(serviceIndex?.["object-store"]?.["swift"] && isEnabled("containers")
      ? [
          {
            service: "containers",
            label: t`Object Storage (Swift)`,
            navigate: (nav: NavigateFn) =>
              nav({
                to: "/projects/$projectId/storage/$provider/$storageType",
                params: { projectId, provider: "swift", storageType: "containers" },
              }),
            params: { projectId, provider: "swift", storageType: "containers" },
          },
        ]
      : []),
    ...(serviceIndex?.["object-store-ceph"]?.["ceph"] && isEnabled("ceph-containers")
      ? [
          {
            service: "ceph-containers",
            label: t`Object Storage (Ceph)`,
            navigate: (nav: NavigateFn) =>
              nav({
                to: "/projects/$projectId/storage/$provider/$storageType",
                params: { projectId, provider: "ceph", storageType: "buckets" },
              }),
            params: { projectId, provider: "ceph", storageType: "buckets" },
          },
        ]
      : []),
  ]

  // Seed the section map with built-in sections
  const sectionMap = new Map<string, NavSection>([
    ["compute", { section: "compute", label: t`Compute`, services: computeServices }],
    ["network", { section: "network", label: t`Network`, services: networkServices }],
    ["storage", { section: "storage", label: t`Storage`, services: storageServices }],
    ["services", { section: "services", label: t`Services`, services: [] }],
  ])

  // Merge service extensions: activate when the service exists in the project's catalog
  for (const extension of serviceExtensions ?? []) {
    if (!serviceIndex[extension.serviceType]?.[extension.serviceName]) continue
    if (enabledServices && !enabledServices.includes(extension.serviceType)) continue

    sectionMap.get("services")?.services.push({
      service: extension.serviceType,
      label: extension.label,
      navigate: (nav: NavigateFn) =>
        nav({
          to: "/projects/$projectId/services/$serviceType",
          params: { projectId, serviceType: extension.serviceType },
        }),
      params: { projectId },
    })
  }

  return [...sectionMap.values()].filter((s) => s.services.length > 0)
}
