import { useNavigate, useMatches, useParams, useRouteContext } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import {
  SideNavigation,
  SideNavigationList,
  SideNavigationGroup,
  SideNavigationItem,
  Divider,
} from "@cloudoperators/juno-ui-components/index"
import { isRouteInfo, ROUTE_SECTIONS, ROUTE_SERVICES } from "@/client/routes/routeInfo"
import { Slot } from "@/client/components/Slot"
import type { NavSection } from "./buildNavSections"

interface SideNavBarProps {
  projectId: string
  projectName: string
  domainName?: string
  sections: NavSection[]
}

export const SideNavBar = ({ projectId, projectName, domainName, sections }: SideNavBarProps) => {
  const navigate = useNavigate()
  const matches = useMatches()
  const { provider } = useParams({ strict: false }) as { provider?: string }
  const { slots } = useRouteContext({ strict: false })

  const navBadge = (service: string) => {
    if (!slots?.serviceBadge) return null
    return <Slot component={slots.serviceBadge} useShadowDOM={false} currentService={service} />
  }

  // Read active section/service from the deepest match that has valid RouteInfo staticData
  const activeMatch = [...matches].reverse().find((m) => isRouteInfo(m.staticData))
  const activeRouteInfo = activeMatch && isRouteInfo(activeMatch.staticData) ? activeMatch.staticData : undefined
  const activeSection = activeRouteInfo?.section ?? null
  const activeService = activeRouteInfo?.service ?? null

  // Track which sections should be forced open by incrementing a counter
  // This forces a remount of SideNavigationGroup since it doesn't expose onToggle
  const [forceOpenCounter, setForceOpenCounter] = useState<Record<string, number>>(() =>
    Object.fromEntries(sections.map((s) => [s.section, 0]))
  )

  // When navigating to a section, force it to expand by remounting
  useEffect(() => {
    if (activeSection) {
      setForceOpenCounter((prev) => ({ ...prev, [activeSection]: (prev[activeSection] || 0) + 1 }))
    }
  }, [activeSection])

  return (
    <SideNavigation ariaLabel="Project Side Navigation">
      <>
        <SideNavigationList>
          <>
            <SideNavigationItem
              onClick={() => navigate({ to: "/projects/$projectId", params: { projectId } })}
              label={
                <>
                  {domainName && <p className="text-theme-light text-xs leading-4 font-bold">{domainName} /</p>}
                  <p className="leading-5 font-normal">{projectName}</p>
                </>
              }
            />
            <Divider spacing="1" />
            {sections.map(({ section, label, services }) => (
              <SideNavigationGroup key={`${section}-${forceOpenCounter[section]}`} label={label} open={true}>
                {services.map((item) => {
                  const isStorageObjectStore =
                    activeSection === ROUTE_SECTIONS.STORAGE && activeService === ROUTE_SERVICES.OBJECT_STORE
                  const isSelected =
                    activeSection === section &&
                    (isStorageObjectStore ? item.params.provider === provider : activeService === item.service)

                  return (
                    <SideNavigationItem
                      key={item.service}
                      onClick={() => item.navigate(navigate)}
                      label={
                        <span className="flex items-start gap-2">
                          {item.label}
                          {navBadge(item.service)}
                        </span>
                      }
                      selected={isSelected}
                    />
                  )
                })}
              </SideNavigationGroup>
            ))}
          </>
        </SideNavigationList>
        {slots?.sideNavBanner && <Slot component={slots.sideNavBanner} />}
      </>
    </SideNavigation>
  )
}
