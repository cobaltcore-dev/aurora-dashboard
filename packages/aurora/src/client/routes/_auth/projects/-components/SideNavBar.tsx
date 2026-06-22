import { useNavigate, useMatches, useParams, useRouteContext } from "@tanstack/react-router"
import { useState, useEffect, useRef } from "react"
import { getServiceIndex } from "@/server/Authentication/helpers"
import {
  SideNavigation,
  SideNavigationList,
  SideNavigationGroup,
  SideNavigationItem,
  Divider,
} from "@cloudoperators/juno-ui-components/index"
import { useLingui } from "@lingui/react/macro"
import { isRouteInfo } from "@/client/routes/routeInfo"
import { Slot } from "@/client/components/Slot"

interface SideNavBarProps {
  projectId: string
  projectName: string
  domainName?: string
  availableServices: {
    type: string
    name: string
  }[]
}

export const SideNavBar = ({ projectId, projectName, domainName, availableServices }: SideNavBarProps) => {
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

  const [sectionKeys, setSectionKeys] = useState({ compute: 0, network: 0, storage: 0, services: 0 })
  const prevSectionRef = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevSectionRef.current
    prevSectionRef.current = activeSection
    if (activeSection && activeSection !== prev && activeSection in sectionKeys) {
      setSectionKeys((s) => ({ ...s, [activeSection]: s[activeSection as keyof typeof sectionKeys] + 1 }))
    }
  }, [activeSection])

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
            to: "/projects/$projectId/storage/$provider/$storageType" as const,
            params: { projectId, provider: "swift", storageType: "containers" },
          },
        ]
      : []),
    {
      service: "ceph-containers",
      label: t`Object Storage (Ceph)`,
      to: "/projects/$projectId/storage/$provider/$storageType" as const,
      params: { projectId, provider: "ceph", storageType: "buckets" },
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
              onClick={() => navigate({ to: "/projects/$projectId", params: { projectId } })}
              label={
                <>
                  {domainName && <p className="text-theme-light text-xs leading-5 font-normal">{domainName} /</p>}
                  <p className="font-normal">{projectName}</p>
                </>
              }
            />
            <Divider spacing="1" />
            <SideNavigationGroup key={sectionKeys.compute} label={t`Compute`} open={true}>
              {computeServices.map(({ service, label, to, params }) => (
                <SideNavigationItem
                  key={label}
                  onClick={() => navigate({ to, params })}
                  label={label}
                  selected={activeSection === "compute" && activeService === service}
                />
              ))}
            </SideNavigationGroup>

            {networkServices.length > 0 && (
              <SideNavigationGroup key={sectionKeys.network} label={t`Network`} open={true}>
                {networkServices.map(({ service, label, to, params }) => (
                  <SideNavigationItem
                    key={label}
                    onClick={() => navigate({ to, params })}
                    label={label}
                    selected={activeSection === "network" && activeService === service}
                  />
                ))}
              </SideNavigationGroup>
            )}

            {storageServices.length > 0 && (
              <SideNavigationGroup key={sectionKeys.storage} label={t`Storage`} open={true}>
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
              </SideNavigationGroup>
            )}

            {clavisServices.length > 0 && (
              <SideNavigationGroup key={sectionKeys.services} label={t`Services`} open={true}>
                {clavisServices.map(({ service, label, to, params }) => (
                  <SideNavigationItem
                    key={label}
                    onClick={() => navigate({ to, params })}
                    label={label}
                    selected={activeSection === "services" && activeService === service}
                  />
                ))}
              </SideNavigationGroup>
            )}
          </>
        </SideNavigationList>
        {slots?.sideNavBanner && <Slot component={slots.sideNavBanner} />}
      </>
    </SideNavigation>
  )
}
