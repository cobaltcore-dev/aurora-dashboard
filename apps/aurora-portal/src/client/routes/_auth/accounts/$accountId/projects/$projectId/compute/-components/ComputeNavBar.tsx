import { getServiceIndex } from "@/server/Authentication/helpers"
import { ContentHeading } from "@cloudoperators/juno-ui-components/index"
import { Trans } from "@lingui/react/macro"
import { useLocation, useParams, Link } from "@tanstack/react-router"

export const ComputeSideNavBar = ({
  availableServices,
}: {
  availableServices: {
    type: string
    name: string
  }[]
}) => {
  const location = useLocation()

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
      { path: computeRootPath, label: <Trans>Overview</Trans> },
      ...(serviceIndex["image"]["glance"] ? [{ path: `${computeRootPath}/images`, label: <Trans>Images</Trans> }] : []),
      ...(serviceIndex["compute"]["nova"]
        ? [
            { path: `${computeRootPath}/instances`, label: <Trans>Instances</Trans> },
            { path: `${computeRootPath}/keypairs`, label: <Trans>Key Pairs</Trans> },
            { path: `${computeRootPath}/servergroups`, label: <Trans>Server Groups</Trans> },
            { path: `${computeRootPath}/flavors`, label: <Trans>Flavors</Trans> },
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
      {/* Navigation */}
      <nav className="w-full flex flex-col rounded-lg items-start ">
        {links.map(({ path, label }) => (
          <Link
            key={path}
            to={path}
            className={`w-full text-base font-medium px-4 py-3 rounded-md transition text-justify hover:text-theme-light
              ${location.pathname === path ? "text-theme-accent" : "text-theme-default"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
