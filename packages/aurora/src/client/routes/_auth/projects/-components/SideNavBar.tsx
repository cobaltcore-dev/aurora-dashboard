import { useNavigate, useMatches, useParams } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { SideNavigation, SideNavigationList, SideNavigationItem } from "@cloudoperators/juno-ui-components/index"
import { useLingui } from "@lingui/react/macro"
import { isRouteInfo } from "@/client/routes/routeInfo"

interface SideNavBarProps {
  projectId: string
  projectName: string
  availableServices: {
    type: string
    name: string
  }[]
}

export const SideNavBar = ({ projectId, projectName, availableServices }: SideNavBarProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const matches = useMatches()
  const { provider } = useParams({ strict: false }) as { provider?: string }

  const openSections = { compute: true, network: true, storage: true, services: true }

  const serviceIndex = getServiceIndex(availableServices)

  // Read active section/service from the deepest match that has valid RouteInfo staticData
  const activeMatch = [...matches].reverse().find((m) => isRouteInfo(m.staticData))
  const activeRouteInfo = activeMatch && isRouteInfo(activeMatch.staticData) ? activeMatch.staticData : undefined
  const activeSection = activeRouteInfo?.section ?? null
  const activeService = activeRouteInfo?.service ?? null

  const computeServices = [
    ...(serviceIndex["image"]?.["glance"]
      ? [
          {
            service: "images",
            label: t`Images`,
            to: "/projects/$projectId/compute/images" as const,
            params: { projectId },
          },
        ]
      : []),
    ...(serviceIndex?.["compute"]?.["nova"]
      ? [
          {
            service: "flavors",
            label: t`Flavors`,
            to: "/projects/$projectId/compute/flavors" as const,
            params: { projectId },
          },
        ]
      : []),
  ]

  const networkServices = [
    ...(serviceIndex["network"]
      ? [
          {
            service: "securitygroups",
            label: t`Security Groups`,
            to: "/projects/$projectId/network/securitygroups" as const,
            params: { projectId },
          },
          {
            service: "floatingips",
            label: t`Floating IPs`,
            to: "/projects/$projectId/network/floatingips" as const,
            params: { projectId },
          },
        ]
      : []),
  ]

  const storageServices = [
    ...(serviceIndex?.["object-store"]?.["swift"]
      ? [
          {
            service: "containers",
            label: t`Object Storage (Swift)`,
            to: "/projects/$projectId/storage/$provider/containers" as const,
            params: { projectId, provider: "swift" },
          },
        ]
      : []),
    {
      service: "ceph-containers",
      label: t`Object Storage (Ceph)`,
      to: "/projects/$projectId/storage/$provider/containers" as const,
      params: { projectId, provider: "ceph" },
    },
  ]

  // temporary as clavis is not fully GA, after GA replace with ["pca"]?.["clavis"]
  const pcaServices = serviceIndex["pca"]?.["clavis-beta"] || serviceIndex["pca"]?.["clavis-dev"]
  const clavisServices = [
    ...(pcaServices
      ? [
          {
            service: "pca",
            label: t`PCA (Clavis)`,
            to: "/projects/$projectId/services/pca" as const,
            params: { projectId },
          },
        ]
      : []),
  ]

  const isOverviewActive = activeSection === null
  const isOpen = (section: string) => openSections[section as keyof typeof openSections] || activeSection === section

  return (
    <SideNavigation ariaLabel="Project Side Navigation">
      <SideNavigationList>
        <>
          <SideNavigationItem
            icon="home"
            label={projectName}
            onClick={() => navigate({ to: "/projects/$projectId", params: { projectId } })}
            selected={isOverviewActive}
          />
          <SideNavigationItem
            label={t`Compute`}
            open={isOpen("compute")}
          >
            {computeServices.map(({ service, label, to, params }) => (
              <SideNavigationItem
                key={label}
                onClick={() => navigate({ to, params })}
                label={label}
                selected={activeSection === "compute" && activeService === service}
              />
            ))}
          </SideNavigationItem>

          {networkServices.length > 0 && (
            <SideNavigationItem
              label={t`Network`}
              open={isOpen("network")}
            >
              {networkServices.map(({ service, label, to, params }) => (
                <SideNavigationItem
                  key={label}
                  onClick={() => navigate({ to, params })}
                  label={label}
                  selected={activeSection === "network" && activeService === service}
                />
              ))}
            </SideNavigationItem>
          )}

          {storageServices.length > 0 && (
            <SideNavigationItem
              label={t`Storage`}
              open={isOpen("storage")}
            >
              {storageServices.map(({ service, label, to, params }) => {
                // For storage services with provider param, match against current provider
                const isStorageContainers = activeSection === "storage" && activeService === "containers"
                const isSelected = isStorageContainers ? params.provider === provider : activeService === service

                return (
                  <SideNavigationItem
                    key={label}
                    onClick={() => navigate({ to, params })}
                    label={label}
                    selected={isSelected}
                  />
                )
              })}
            </SideNavigationItem>
          )}

          {clavisServices.length > 0 && (
            <SideNavigationItem
              label={t`Services`}
              open={isOpen("services")}
            >
              {clavisServices.map(({ service, label, to, params }) => (
                <SideNavigationItem
                  key={label}
                  onClick={() => navigate({ to, params })}
                  label={label}
                  selected={activeSection === "services" && activeService === service}
                />
              ))}
            </SideNavigationItem>
          )}
        </>
      </SideNavigationList>
    </SideNavigation>
  )
}
