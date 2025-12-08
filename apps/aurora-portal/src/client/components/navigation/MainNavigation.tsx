import Logo from "../../assets/logo.svg?react"

import { NavigationItem } from "./types"

import { isMatch, Link, MakeRouteMatchUnion, useRouterState } from "@tanstack/react-router"
import { UserMenu } from "./UserMenu"
import { PageHeader, ThemeToggle } from "@cloudoperators/juno-ui-components/index"

interface NavigationProps {
  items: NavigationItem[]
  handleThemeToggle?: (theme: string) => void
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

export function MainNavigation({ items, handleThemeToggle }: NavigationProps) {
  const matches = useRouterState({ select: (s) => s.matches })
  const domain = getDomain(matches)
  const project = getProject(matches)

  return (
    <PageHeader
      logo={<Logo className="w-6 h-6 fill-theme-accent flex-shrink-0" title="Aurora" />}
      applicationName={
        <div className="flex items-center space-x-2 flex-nowrap">
          <Link to="/" className="flex items-center space-x-2 flex-nowrap">
            <span className="flex-shrink-0 text-theme-high ">Aurora</span>
          </Link>
          {domain && (
            <>
              <span className="flex-shrink-0 text-theme-high/40">/</span>
              <Link to={domain.path} data-testid="domain-link" className="text-theme-high flex-shrink-0">
                {domain.name}
              </Link>
            </>
          )}
          {project && (
            <>
              <span className="flex-shrink-0 text-theme-high/40 ">/</span>
              <Link
                to={project.path + "/compute/$"}
                data-testid="project-link"
                className="text-theme-high flex-shrink-0 capitalize"
              >
                {project.name}
              </Link>
            </>
          )}
        </div>
      }
    >
      {items.map(({ route, label }, index) => (
        <Link className="text-theme-high" key={index} to={route}>
          {label}
        </Link>
      ))}
      <ThemeToggle onToggleTheme={(newTheme: string) => handleThemeToggle?.(newTheme)} />
      <UserMenu />
    </PageHeader>
  )
}
