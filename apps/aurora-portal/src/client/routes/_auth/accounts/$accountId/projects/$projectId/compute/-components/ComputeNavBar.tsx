import { useLocation, useNavigate } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { SideNavigation, SideNavigationList, SideNavigationItem } from "@cloudoperators/juno-ui-components/index"
import { useLingui } from "@lingui/react/macro"

interface ComputeSideNavBarProps {
  accountId: string
  projectId: string
  availableServices: {
    type: string
    name: string
  }[]
}

export const ComputeSideNavBar = ({ accountId, projectId, availableServices }: ComputeSideNavBarProps) => {
  const { t } = useLingui()
  const location = useLocation()
  const navigate = useNavigate()

  const computeRootPath = `/accounts/${accountId}/projects/${projectId}/compute`

  const serviceIndex = getServiceIndex(availableServices)

  const getComputeNavigationLinks = () => {
    return [
      { path: computeRootPath, label: t`Overview` },
      ...(serviceIndex["image"]["glance"] ? [{ path: `${computeRootPath}/images`, label: t`Images` }] : []),
      ...(serviceIndex["compute"]["nova"]
        ? [
            // { path: `${computeRootPath}/instances`, label: t`Instances` },
            // { path: `${computeRootPath}/keypairs`, label: t`Key Pairs` },
            // { path: `${computeRootPath}/servergroups`, label: t`Server Groups` },
            { path: `${computeRootPath}/flavors`, label: t`Flavors` },
          ]
        : []),
    ]
  }

  const links = getComputeNavigationLinks()

  const handleNavigate = (path: string) => {
    navigate({ to: path })
  }

  return (
    <SideNavigation ariaLabel="Compute Side Navigation" onActiveItemChange={() => {}}>
      <SideNavigationList>
        {links.map(({ path, label }) => (
          <SideNavigationItem
            key={path}
            onClick={() => handleNavigate(path)}
            label={label}
            selected={location.pathname === path}
          />
        ))}
      </SideNavigationList>
    </SideNavigation>
  )
}
