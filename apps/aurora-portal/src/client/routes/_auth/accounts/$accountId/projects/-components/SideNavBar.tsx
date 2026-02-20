import { useLocation, useNavigate } from "@tanstack/react-router"
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

  const computeRootPath = `/accounts/${accountId}/projects/${projectId}/compute`
  const networkRootPath = `/accounts/${accountId}/projects/${projectId}/network`
  const storageRootPath = `/accounts/${accountId}/projects/${projectId}/storage`

  const serviceIndex = getServiceIndex(availableServices)

  const getComputeNavigationLinks = () => {
    return [
      { path: computeRootPath, label: t`Overview` },
      ...(serviceIndex["image"]?.["glance"] ? [{ path: `${computeRootPath}/images`, label: t`Images` }] : []),
      ...(serviceIndex?.["compute"]?.["nova"]
        ? [
          // { path: `${computeRootPath}/instances`, label: t`Instances` },
          // { path: `${computeRootPath}/keypairs`, label: t`Key Pairs` },
          // { path: `${computeRootPath}/servergroups`, label: t`Server Groups` },
          { path: `${computeRootPath}/flavors`, label: t`Flavors` },
        ]
        : []),
    ]
  }

  const getNetworkNavigationLinks = () => {
    return [
      ...(serviceIndex["network"]
        ? [{ path: `${networkRootPath}/securitygroups`, label: t`Security Groups` }]
        : []),
    ]
  }

  const getStorageNavigationLinks = () => {
    return [
      ...(serviceIndex?.["object-store"]?.["swift"]
        ? [{ path: `${storageRootPath}/objectstorage`, label: t`Object Storage` }]
        : []),
    ]
  }

  const computeLinks = getComputeNavigationLinks()
  const networkLinks = getNetworkNavigationLinks()
  const storageLinks = getStorageNavigationLinks()

  const handleNavigate = (path: string) => {
    navigate({ to: path })
  }

  return (
    <SideNavigation ariaLabel="Project Side Navigation" onActiveItemChange={() => { }}>
      <SideNavigationList>
        <>
          {computeLinks.length > 0 && (
            <SideNavigationItem label="Compute">
              {computeLinks.map(({ path, label }) => (
                <SideNavigationItem
                  key={path}
                  onClick={() => handleNavigate(path)}
                  label={label}
                  selected={location.pathname === path}
                />
              ))}
            </SideNavigationItem>
          )}

          {networkLinks.length > 0 && (
            <SideNavigationItem label="Network">
              {networkLinks.map(({ path, label }) => (
                <SideNavigationItem
                  key={path}
                  onClick={() => handleNavigate(path)}
                  label={label}
                  selected={location.pathname === path}
                />
              ))}
            </SideNavigationItem>
          )}

          {storageLinks.length > 0 && (
            <SideNavigationItem label="Storage">
              {storageLinks.map(({ path, label }) => (
                <SideNavigationItem
                  key={path}
                  onClick={() => handleNavigate(path)}
                  label={label}
                  selected={location.pathname === path}
                />
              ))}
            </SideNavigationItem>
          )}
        </>
      </SideNavigationList>
    </SideNavigation>
  )
}
