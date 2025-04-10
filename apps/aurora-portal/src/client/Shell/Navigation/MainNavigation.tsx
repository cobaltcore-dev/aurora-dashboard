// MainNavigation.tsx
import { Link, useLoaderData } from "react-router-dom"
import Logo from "../../assets/logo.svg?react"

import { NavigationItem } from "./types"
import { UserMenu } from "./UserMenu"

interface NavigationProps {
  items: NavigationItem[]
}

export function MainNavigation({ items }: NavigationProps) {
  const { domain, project } = useLoaderData()
  const projectsPath = `/accounts/${domain?.id}/projects`

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
          {domain?.id && (
            <Link to={projectsPath} data-testid="domain-link" className="flex items-center space-x-3">
              {/* Changed href to to */}
              <span className="text-sap-grey-1">/</span>
              <span className="font-semibold text-lg text-sap-grey-2">{domain.name}</span>
            </Link>
          )}
          {project?.name && (
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
