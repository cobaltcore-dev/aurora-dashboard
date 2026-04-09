import { useNavigate, useLocation } from "@tanstack/react-router"
import { useState } from "react"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { SideNavigation, SideNavigationList, SideNavigationItem } from "@cloudoperators/juno-ui-components/index"
import { useLingui } from "@lingui/react/macro"

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
  const location = useLocation()
  const navigate = useNavigate()

  const [openSections, setOpenSections] = useState({ compute: true, network: true, storage: true })

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const computeRootPath = `/accounts/${accountId}/projects/${projectId}/compute`
  const networkRootPath = `/accounts/${accountId}/projects/${projectId}/network`
  const storageRootPath = `/accounts/${accountId}/projects/${projectId}/storage`

  const serviceIndex = getServiceIndex(availableServices)

  const pathname = location.pathname.replace(/\/$/, "")

  const getComputeNavigationLinks = () => {
    return [
      {
        path: computeRootPath,
        label: t`Overview`,
        to: "/accounts/$accountId/projects/$projectId/compute/$" as const,
        params: { accountId, projectId, _splat: undefined },
      },
      ...(serviceIndex["image"]?.["glance"]
        ? [
            {
              path: `${computeRootPath}/images`,
              label: t`Images`,
              to: "/accounts/$accountId/projects/$projectId/compute/$" as const,
              params: { accountId, projectId, _splat: "images" },
            },
          ]
        : []),
      ...(serviceIndex?.["compute"]?.["nova"]
        ? [
            {
              path: `${computeRootPath}/flavors`,
              label: t`Flavors`,
              to: "/accounts/$accountId/projects/$projectId/compute/$" as const,
              params: { accountId, projectId, _splat: "flavors" },
            },
          ]
        : []),
    ]
  }

  const getNetworkNavigationLinks = () => {
    return [
      ...(serviceIndex["network"] ? [{ path: `${networkRootPath}/securitygroups`, label: t`Security Groups` }] : []),
      ...(serviceIndex["network"] ? [{ path: `${networkRootPath}/floatingips`, label: t`Floating IPs` }] : []),
    ]
  }

  const getStorageNavigationLinks = () => {
    return [
      ...(serviceIndex?.["object-store"]?.["swift"]
        ? [{ path: `${storageRootPath}/swift/containers`, label: t`Swift` }]
        : []),
    ]
  }

  const computeLinks = getComputeNavigationLinks()
  const networkLinks = getNetworkNavigationLinks()
  const storageLinks = getStorageNavigationLinks()

  const handleNavigate = (path: string) => {
    navigate({ to: path })
  }

  const handleComputeNavigate = (
    to: "/accounts/$accountId/projects/$projectId/compute/$",
    params: { accountId: string; projectId: string; _splat: string | undefined }
  ) => {
    navigate({ to, params })
  }

  return (
    <SideNavigation ariaLabel="Project Side Navigation" onActiveItemChange={() => {}}>
      <SideNavigationList>
        <>
          {computeLinks.length > 0 && (
            <SideNavigationItem label="Compute" open={openSections.compute} onClick={() => toggleSection("compute")}>
              {computeLinks.map(({ path, label, to, params }) => (
                <SideNavigationItem
                  key={path}
                  onClick={() => handleComputeNavigate(to, params)}
                  label={label}
                  selected={
                    pathname.startsWith(path) &&
                    !computeLinks.some(
                      (l) => l.path !== path && l.path.length > path.length && pathname.startsWith(l.path)
                    )
                  }
                />
              ))}
            </SideNavigationItem>
          )}

          {networkLinks.length > 0 && (
            <SideNavigationItem label="Network" open={openSections.network} onClick={() => toggleSection("network")}>
              {networkLinks.map(({ path, label }) => (
                <SideNavigationItem
                  key={path}
                  onClick={() => handleNavigate(path)}
                  label={label}
                  selected={pathname.startsWith(path)}
                />
              ))}
            </SideNavigationItem>
          )}

          {storageLinks.length > 0 && (
            <SideNavigationItem label="Storage" open={openSections.storage} onClick={() => toggleSection("storage")}>
              {storageLinks.map(({ path, label }) => (
                <SideNavigationItem
                  key={path}
                  onClick={() => handleNavigate(path)}
                  label={label}
                  selected={pathname.startsWith(path)}
                />
              ))}
            </SideNavigationItem>
          )}
        </>
      </SideNavigationList>
    </SideNavigation>
  )
}
