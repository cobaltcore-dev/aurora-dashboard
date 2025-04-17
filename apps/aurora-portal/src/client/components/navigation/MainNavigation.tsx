// MainNavigation.tsx
import Logo from "../../assets/logo.svg?react"

import { NavigationItem } from "./types"

import { isMatch, Link, MakeRouteMatchUnion, useRouterState } from "@tanstack/react-router"
import { UserMenu } from "./UserMenu"

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
  const matches = useRouterState({ select: (s) => s.matches })
  const domain = getDomain(matches)
  const project = getProject(matches)
  return (
    <nav>
      {/* Main Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-4">
          <Link to={"/"} className="flex items-center space-x-3">
            {/* Changed href to to */}
            <Logo className="w-6 h-6 fill-current" title="Aurora" />
            <span className="text-lg font-medium text-sap-grey-2">Aurora</span>
          </Link>
          {domain && (
            <Link to={domain.path} data-testid="domain-link" className="flex items-center space-x-3">
              {/* Changed href to to */}
              <span className="text-sap-grey-1">/</span>
              <span className="font-semibold text-lg text-sap-grey-2">{domain.name}</span>
            </Link>
          )}
          {project && (
            <>
              <span className="text-sap-grey-1">/</span>
              <span className="font-semibold text-lg text-sap-grey-2">{project.name}</span>
            </>
          )}
        </div>
        {/* Right Section: Extensions, About, & User Menu */}
        <div className="flex items-center space-x-4">
          {items.map(({ route, label }, index) => (
            <Link key={index} to={route} className="text-sap-grey-2 hover:text-sap-grey-2 font-medium">
              {/* Changed href to to */}
              {label}
            </Link>
          ))}
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
