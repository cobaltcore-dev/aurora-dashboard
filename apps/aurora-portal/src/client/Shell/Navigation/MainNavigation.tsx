import { Link } from "wouter"

import { useAuth } from "../AuthProvider"
import { AuroraNavigationToolbar } from "./AuroraNavigationToolbar"
import { NavigationItem } from "./types"
import { UserMenu } from "./UserMenu"
import { useAuroraContext } from "../AuroraProvider"

// const navItem = (active: boolean) =>
//   `px-2 py-2 hover:text-theme-high ${active ? "font-semibold text-theme-accent" : "text-gray-700"}`

interface NavigationProps {
  items: NavigationItem[]
  scopedDomain:
    | {
        id?: string | undefined
        name?: string | undefined
      }
    | undefined
}

export function MainNavigation({ items, scopedDomain }: NavigationProps) {
  const { currentProject } = useAuroraContext()

  return (
    <nav>
      {/* Main Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3">
        <AuroraNavigationToolbar scopedDomain={scopedDomain} scopedProject={currentProject} />
        {/* Right Section: About & User Menu */}
        <div className="flex items-center space-x-4">
          <Link href="/about" className="text-sap-grey-2 hover:text-sap-grey-2 font-medium">
            About
          </Link>
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
