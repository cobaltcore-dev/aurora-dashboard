import { Link } from "wouter"
import Logo from "../../assets/logo.svg?react"

import { NavigationItem } from "./types"
import { UserMenu } from "./UserMenu"
import { AuroraContext } from "../AuroraProvider"

import { use } from "react"

interface NavigationProps {
  items: NavigationItem[]
}

export function MainNavigation({ items }: NavigationProps) {
  const context = use(AuroraContext)
  if (!context) return null
  const { domain, currentScope } = context

  return (
    <nav>
      {/* Main Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center space-x-4">
          <Link href={context.auroraRoutes.home} className="flex items-center space-x-3">
            <Logo className="w-6 h-6 fill-current" title="Aurora" />
            {/* Decreased logo size slightly for better alignment */}
            <span className="text-lg font-medium text-sap-grey-2">Aurora</span>
            {/* Slightly smaller font for better balance */}
          </Link>
          {domain?.id && (
            <Link href={context.auroraRoutes.domain(domain.id).projects} className="flex items-center space-x-3">
              <span className="text-sap-grey-1">/</span>
              <span className="font-semibold text-lg text-sap-grey-2">{domain.name}</span>
            </Link>
          )}
          {currentScope?.scope?.project?.name && (
            <>
              <span className="text-sap-grey-1">/</span>
              <span className="font-semibold text-lg text-sap-grey-2">{currentScope?.scope?.project?.name}</span>
            </>
          )}
        </div>
        {/* Right Section: Extensions, Aboutm & User Menu */}
        <div className="flex items-center space-x-4">
          {items.map(({ route, label }) => (
            <Link href={route} className="text-sap-grey-2 hover:text-sap-grey-2 font-medium">
              {label}
            </Link>
          ))}
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
