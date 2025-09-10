import { ContentHeading } from "@cloudoperators/juno-ui-components/index"
import { useLocation, useParams, Link } from "@tanstack/react-router"

export const ComputeSideNavBar = () => {
  const location = useLocation()

  const { projectId, domain } = useParams({
    from: "/_auth/accounts/$accountId/projects/$projectId/compute/$",
    select: (params) => {
      return { projectId: params.projectId, domain: params.accountId }
    },
  })

  const computeRootPath = `/accounts/${domain}/projects/${projectId}/compute`

  const links = [
    { path: computeRootPath, label: "Overview" },
    { path: `${computeRootPath}/instances`, label: "Instances" },
    { path: `${computeRootPath}/images`, label: "Images" },
    { path: `${computeRootPath}/keypairs`, label: "Key Pairs" },
    { path: `${computeRootPath}/servergroups`, label: "Server Groups" },
    { path: `${computeRootPath}/flavors`, label: "Flavors" },
  ]

  return (
    <div className="w-full flex flex-col items-start px-4">
      <ContentHeading>Compute</ContentHeading>
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
