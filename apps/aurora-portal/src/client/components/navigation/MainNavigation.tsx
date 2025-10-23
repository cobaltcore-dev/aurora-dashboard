import Logo from "../../assets/logo.svg?react"
import { NavigationItem } from "./types"
import { isMatch, Link, MakeRouteMatchUnion, useRouterState } from "@tanstack/react-router"
import { UserMenu } from "./UserMenu"
import { useNavigate } from "@tanstack/react-router"

interface NavigationProps {
  items: NavigationItem[]
}

function getDomain(matches: MakeRouteMatchUnion[]) {
  const domainMatch = matches.filter((match) => isMatch(match, "loaderData.crumbDomain"))[0]
  if (!domainMatch) {
    return null
  }
  return {
    name: domainMatch?.loaderData?.crumbDomain?.name,
    path: domainMatch?.loaderData?.crumbDomain?.path,
  }
}

function getProject(matches: MakeRouteMatchUnion[]) {
  const projectMatch = matches.filter((match) => isMatch(match, "loaderData.crumbProject"))[0]
  if (!projectMatch) {
    return null
  }
  return {
    name: projectMatch.loaderData?.crumbProject?.name || undefined,
    path: projectMatch.fullPath,
  }
}

export function MainNavigation({ items }: NavigationProps) {
  const navigate = useNavigate()
  const matches = useRouterState({ select: (s) => s.matches })
  const domain = getDomain(matches)
  const project = getProject(matches)

  const handleHeaderClick = () => {
    navigate({ to: "/" })
  }

  return (
    <nav>
      <div className="flex items-center justify-between w-full px-6 py-3 bg-theme-background border-b border-theme-border">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={handleHeaderClick}>
            <Logo className="w-6 h-6 fill-theme-accent" title="Aurora" />
            <span className="text-theme-high font-medium">Aurora</span>
          </div>

          {domain && (
            <Link to={domain.path} data-testid="domain-link" className="text-theme-high capitalize">
              {domain.name}
            </Link>
          )}

          {project && (
            <Link to={project.path + "/compute/$"} data-testid="project-link" className="text-theme-high capitalize">
              {project.name}
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {items.map(({ route, label }, index) => (
            <Link className="text-theme-high" key={index} to={route}>
              {label}
            </Link>
          ))}
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
