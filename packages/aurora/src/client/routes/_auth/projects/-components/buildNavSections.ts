import { getServiceIndex } from "@/server/Authentication/helpers"
import { t } from "@lingui/core/macro"
import type { NavigateFn } from "@tanstack/react-router"
import { canAccessClavisPca } from "@/client/routes/_auth/projects/$projectId/services/pca/-components/pcaAccess"

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
  enabledServices?: string[]
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
    ...(serviceIndex?.["object-store"]?.["swift"] && isEnabled("swift")
      ? [
          {
            service: "swift",
            label: t`Object Storage (Swift)`,
            navigate: (nav: NavigateFn) =>
              nav({
                to: "/projects/$projectId/storage/swift/containers",
                params: { projectId },
              }),
            params: { projectId },
          },
        ]
      : []),
    ...(isEnabled("ceph")
      ? [
          {
            service: "ceph",
            label: t`Object Storage (Ceph)`,
            navigate: (nav: NavigateFn) =>
              nav({
                to: "/projects/$projectId/storage/ceph/buckets",
                params: { projectId },
              }),
            params: { projectId },
          },
        ]
      : []),
  ]

  const clavisServices: NavItem[] = canAccessClavisPca(serviceIndex, enabledServices)
    ? [
        {
          service: "pca",
          label: t`PCA (Clavis)`,
          navigate: (nav: NavigateFn) => nav({ to: "/projects/$projectId/services/pca", params: { projectId } }),
          params: { projectId },
        },
      ]
    : []

  return [
    { section: "compute", label: t`Compute`, services: computeServices },
    { section: "network", label: t`Network`, services: networkServices },
    { section: "storage", label: t`Storage`, services: storageServices },
    { section: "services", label: t`Services`, services: clavisServices },
  ].filter((s) => s.services.length > 0)
}
