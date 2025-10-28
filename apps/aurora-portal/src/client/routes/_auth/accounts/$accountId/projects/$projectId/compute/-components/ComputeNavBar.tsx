import { getServiceIndex } from "@/server/Authentication/helpers"
import {
  ContentHeading,
  SideNavigation,
  SideNavigationList,
  SideNavigationItem,
} from "@cloudoperators/juno-ui-components/index"
import { Trans, useLingui } from "@lingui/react/macro"
import { useParams } from "@tanstack/react-router"

export const ComputeSideNavBar = ({
  availableServices,
}: {
  availableServices: {
    type: string
    name: string
  }[]
}) => {
  const { t } = useLingui()

  const { projectId, domain } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/$",
    select: (params) => {
      return { projectId: params.projectId, domain: params.accountId }
    },
  })

  const computeRootPath = `/accounts/${domain}/projects/${projectId}/compute`

  const serviceIndex = getServiceIndex(availableServices)

  const getComputeNavigationLinks = () => {
    return [
      // { path: computeRootPath, label: t`Overview` },
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

  return (
    <div className="w-full flex flex-col items-start px-4">
      <ContentHeading>
        <Trans>Compute</Trans>
      </ContentHeading>
      <SideNavigation ariaLabel="Compute Side Navigation" onActiveItemChange={() => {}}>
        <SideNavigationList>
          {links.map(({ path, label }) => (
            <SideNavigationItem key={path} href={path} label={label} />
          ))}
        </SideNavigationList>
      </SideNavigation>
    </div>
  )
}
