import { useNavigate, useMatches } from "@tanstack/react-router"
import { useState } from "react"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { SideNavigation, SideNavigationList, SideNavigationItem } from "@cloudoperators/juno-ui-components/index"
import { useLingui } from "@lingui/react/macro"
import { isRouteInfo } from "@/client/routes/routeInfo"

interface SideNavBarProps {
  accountId: string
  projectId: string
  availableServices: {
    type: string
    name: string
  }[]
}

export const SideNavBar = ({ accountId, projectId, availableServices }: SideNavBarProps) => {
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
            to: "/accounts/$accountId/projects/$projectId/compute/images" as const,
            params: { accountId, projectId },
          },
        ]
      : []),
    ...(serviceIndex?.["compute"]?.["nova"]
      ? [
          {
            service: "flavors",
            label: t`Flavors`,
            to: "/accounts/$accountId/projects/$projectId/compute/flavors" as const,
            params: { accountId, projectId },
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
            to: "/accounts/$accountId/projects/$projectId/network/securitygroups" as const,
            params: { accountId, projectId },
          },
          {
            service: "floatingips",
            label: t`Floating IPs`,
            to: "/accounts/$accountId/projects/$projectId/network/floatingips" as const,
            params: { accountId, projectId },
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
            to: "/accounts/$accountId/projects/$projectId/storage/$provider/containers" as const,
            params: { accountId, projectId, provider: "swift" },
          },
        ]
      : []),
  ]

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used by commented-out Project Overview item
  const isOverviewActive = activeSection === null

  return (
    <SideNavigation ariaLabel="Project Side Navigation" onActiveItemChange={() => {}}>
      <SideNavigationList>
        <>
          {/* <SideNavigationItem
            label={t`Project Overview`}
            onClick={() =>
              navigate({ to: "/accounts/$accountId/projects/$projectId", params: { accountId, projectId } })
            }
            selected={isOverviewActive}
          /> */}
          <SideNavigationItem
            label={t`Compute`}
            open={openSections.compute}
            onClick={() => setOpenSections((prev) => ({ ...prev, compute: !prev.compute }))}
            // onClick={() => {
            //   navigate({
            //     to: "/accounts/$accountId/projects/$projectId/compute/overview",
            //     params: { accountId, projectId },
            //   })
            //   setOpenSections((prev) => ({ ...prev, compute: true }))
            // }}
            // selected={activeSection === "compute" && activeService === "overview"}
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
              // onClick={() => {
              //   navigate({
              //     to: "/accounts/$accountId/projects/$projectId/network/overview",
              //     params: { accountId, projectId },
              //   })
              //   setOpenSections((prev) => ({ ...prev, network: true }))
              // }}
              // selected={activeSection === "network" && activeService === "overview"}
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
              // onClick={() => setOpenSections((prev) => ({ ...prev, storage: !prev.storage }))}
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
