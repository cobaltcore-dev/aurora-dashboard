import { getServiceIndex } from "@/server/Authentication/helpers"
import { i18n } from "@lingui/core"
import type { NavigateFn } from "@tanstack/react-router"

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
            label: i18n._({ id: "Images", message: "Images" }),
            navigate: (nav: NavigateFn) => nav({ to: "/projects/$projectId/compute/images", params: { projectId } }),
            params: { projectId },
          },
        ]
      : []),
    ...(serviceIndex?.["compute"]?.["nova"] && isEnabled("flavors")
      ? [
          {
            service: "flavors",
            label: i18n._({ id: "Flavors", message: "Flavors" }),
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
                label: i18n._({ id: "Security Groups", message: "Security Groups" }),
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
                label: i18n._({ id: "Floating IPs", message: "Floating IPs" }),
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
            label: i18n._({ id: "Object Storage (Swift)", message: "Object Storage (Swift)" }),
            navigate: (nav: NavigateFn) =>
              nav({
                to: "/projects/$projectId/storage/$provider/$storageType",
                params: { projectId, provider: "swift", storageType: "containers" },
              }),
            params: { projectId, provider: "swift", storageType: "containers" },
          },
        ]
      : []),
    ...(isEnabled("ceph-containers")
      ? [
          {
            service: "ceph-containers",
            label: i18n._({ id: "Object Storage (Ceph)", message: "Object Storage (Ceph)" }),
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

  // temporary as clavis is not fully GA, after GA replace with ["pca"]?.["clavis"]
  const pcaServices = serviceIndex["pca"]?.["clavis-beta"] || serviceIndex["pca"]?.["clavis-dev"]
  const clavisServices: NavItem[] =
    pcaServices && isEnabled("pca")
      ? [
          {
            service: "pca",
            label: i18n._({ id: "PCA (Clavis)", message: "PCA (Clavis)" }),
            navigate: (nav: NavigateFn) => nav({ to: "/projects/$projectId/services/pca", params: { projectId } }),
            params: { projectId },
          },
        ]
      : []

  return [
    { section: "compute", label: i18n._({ id: "Compute", message: "Compute" }), services: computeServices },
    { section: "network", label: i18n._({ id: "Network", message: "Network" }), services: networkServices },
    { section: "storage", label: i18n._({ id: "Storage", message: "Storage" }), services: storageServices },
    { section: "services", label: i18n._({ id: "Services", message: "Services" }), services: clavisServices },
  ].filter((s) => s.services.length > 0)
}
