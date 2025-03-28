import { Link } from "wouter"
import { AuroraNavigationToolbar } from "./AuroraNavigationToolbar"
import { NavigationItem } from "./types"
import { UserMenu } from "./UserMenu"
import { useAuroraContext } from "../AuroraProvider"
import { Project } from "../../../server/Project/types/models"
import { Domain } from "../../../server/Authentication/types/models"

interface NavigationProps {
  items: NavigationItem[]
  domain: Domain
  project: Project
}

export function MainNavigation({ domain, project }: NavigationProps) {
  const { auroraRoutes } = useAuroraContext()

  return (
    <nav>
      {/* Main Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3">
        <AuroraNavigationToolbar scopedDomain={domain} scopedProject={project} />
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
