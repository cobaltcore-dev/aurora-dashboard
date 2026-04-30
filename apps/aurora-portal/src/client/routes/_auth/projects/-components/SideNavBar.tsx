import { useNavigate, useMatches } from "@tanstack/react-router"
import { useState } from "react"
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

  const [openSections, setOpenSections] = useState({ compute: true, network: true, storage: true })

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
            label: t`Swift`,
            to: "/projects/$projectId/storage/$provider/containers" as const,
            params: { projectId, provider: "swift" },
          },
        ]
      : []),
  ]

  const isOverviewActive = activeSection === null

  return (
    <SideNavigation ariaLabel="Project Side Navigation" onActiveItemChange={() => {}}>
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
            open={openSections.compute}
            onClick={() => setOpenSections((prev) => ({ ...prev, compute: !prev.compute }))}
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
              open={openSections.network}
              onClick={() => setOpenSections((prev) => ({ ...prev, network: !prev.network }))}
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
              open={openSections.storage}
              onClick={() => setOpenSections((prev) => ({ ...prev, storage: !prev.storage }))}
            >
              {storageServices.map(({ service, label, to, params }) => (
                <SideNavigationItem
                  key={label}
                  onClick={() => navigate({ to, params })}
                  label={label}
                  selected={activeSection === "storage" && activeService === service}
                />
              ))}
            </SideNavigationItem>
          )}
        </>
      </SideNavigationList>
    </SideNavigation>
  )
}
