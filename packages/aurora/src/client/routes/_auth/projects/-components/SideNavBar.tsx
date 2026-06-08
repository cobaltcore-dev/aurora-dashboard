import { useNavigate, useMatches, useParams, useRouteContext } from "@tanstack/react-router"
import { type MouseEvent, useState, useEffect } from "react"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { SideNavigation, SideNavigationList, SideNavigationItem } from "@cloudoperators/juno-ui-components/index"
import { useLingui } from "@lingui/react/macro"
import { isRouteInfo } from "@/client/routes/routeInfo"
import { Slot } from "@/client/components/Slot"

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
  const { slots } = useRouteContext({ strict: false })

  // Read active section/service from the deepest match that has valid RouteInfo staticData
  const activeMatch = [...matches].reverse().find((m) => isRouteInfo(m.staticData))
  const activeRouteInfo = activeMatch && isRouteInfo(activeMatch.staticData) ? activeMatch.staticData : undefined
  const activeSection = activeRouteInfo?.section ?? null
  const activeService = activeRouteInfo?.service ?? null

  const serviceIndex = getServiceIndex(availableServices)

  const [openSections, setOpenSections] = useState({ compute: true, network: true, storage: true, services: true })
  const toggle = (section: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))

  // When navigating into a section, force Juno to re-open it by resetting the key
  const [sectionKeys, setSectionKeys] = useState({ compute: 0, network: 0, storage: 0, services: 0 })

  useEffect(() => {
    if (activeSection && activeSection in sectionKeys) {
      setSectionKeys((prev) => ({ ...prev, [activeSection]: prev[activeSection as keyof typeof sectionKeys] + 1 }))
      setOpenSections((prev) => ({ ...prev, [activeSection]: true }))
    }
  }, [activeSection])

  const isOverviewActive = activeSection === null

  const handleSectionClick = (section: keyof typeof openSections) => (e: MouseEvent<HTMLDivElement>) => {
    // Only toggle if the click is on the header row (has expand-icon sibling), not on child items
    const clickedItem = (e.target as HTMLElement).closest(".juno-sidenavigation-item")
    if (clickedItem && clickedItem.parentElement?.querySelector(".expand-icon")) {
      toggle(section)
    }
  }

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

  return (
    <SideNavigation ariaLabel="Project Side Navigation">
      <>
        <SideNavigationList>
          <>
            <SideNavigationItem
              icon="home"
              label={projectName}
              onClick={() => navigate({ to: "/projects/$projectId", params: { projectId } })}
              selected={isOverviewActive}
            />
            {/* onClickCapture fires before Juno's chevron stopPropagation, keeping our state in sync */}
            <div onClickCapture={handleSectionClick("compute")}>
              <SideNavigationItem key={sectionKeys.compute} label={t`Compute`} open={openSections.compute}>
                {computeServices.map(({ service, label, to, params }) => (
                  <SideNavigationItem
                    key={label}
                    onClick={() => navigate({ to, params })}
                    label={label}
                    selected={activeSection === "compute" && activeService === service}
                  />
                ))}
              </SideNavigationItem>
            </div>

            {networkServices.length > 0 && (
              <div onClickCapture={handleSectionClick("network")}>
                <SideNavigationItem key={sectionKeys.network} label={t`Network`} open={openSections.network}>
                  {networkServices.map(({ service, label, to, params }) => (
                    <SideNavigationItem
                      key={label}
                      onClick={() => navigate({ to, params })}
                      label={label}
                      selected={activeSection === "network" && activeService === service}
                    />
                  ))}
                </SideNavigationItem>
              </div>
            )}

            {storageServices.length > 0 && (
              <div onClickCapture={handleSectionClick("storage")}>
                <SideNavigationItem key={sectionKeys.storage} label={t`Storage`} open={openSections.storage}>
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
              </div>
            )}

            {clavisServices.length > 0 && (
              <div onClickCapture={handleSectionClick("services")}>
                <SideNavigationItem key={sectionKeys.services} label={t`Services`} open={openSections.services}>
                  {clavisServices.map(({ service, label, to, params }) => (
                    <SideNavigationItem
                      key={label}
                      onClick={() => navigate({ to, params })}
                      label={label}
                      selected={activeSection === "services" && activeService === service}
                    />
                  ))}
                </SideNavigationItem>
              </div>
            )}
          </>
        </SideNavigationList>
        {slots?.sideNavBanner && <Slot component={slots.sideNavBanner} />}
      </>
    </SideNavigation>
  )
}
