import { Link } from "wouter"

import { AuroraNavigationToolbar } from "./AuroraNavigationToolbar"
import { NavigationItem } from "./types"
import { UserMenu } from "./UserMenu"
import { useAuroraContext } from "../AuroraProvider"

interface NavigationProps {
  items: NavigationItem[]
  scopedDomain:
    | {
        id?: string | undefined
        name?: string | undefined
      }
    | undefined
}

export function MainNavigation({ scopedDomain }: NavigationProps) {
  const { currentProject, auroraRoutes } = useAuroraContext()

  return (
    <nav>
      {/* Main Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3">
        <AuroraNavigationToolbar scopedDomain={scopedDomain} scopedProject={currentProject} />
        {/* Right Section: About & User Menu */}
        <div className="flex items-center space-x-4">
          <Link href={auroraRoutes.about} className="text-sap-grey-2 hover:text-sap-grey-2 font-medium">
            About
          </Link>
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
