import { Link } from "wouter"
import Logo from "../../assets/logo.svg?react"

import { UserMenu } from "./UserMenu"
import { NavigationItem } from "./types"
import { useAuth } from "../AuthProvider"

// const navItem = (active: boolean) =>
//   `px-2 py-2 hover:text-theme-high ${active ? "font-semibold text-theme-accent" : "text-gray-700"}`

interface NavigationProps {
  items: NavigationItem[]
}

export function MainNavigation({ items }: NavigationProps) {
  // const [location] = useLocation()
  const { scopedDomain, scopedProject } = useAuth()
  console.info(items)
  return (
    <nav>
      {/* Main Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left Section: Logo & Aurora */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-3">
            <Logo className="w-6 h-6 fill-current" title="Aurora" />
            {/* Decreased logo size slightly for better alignment */}
            <span className="text-lg font-medium text-sap-grey-2">Aurora</span>
            {/* Slightly smaller font for better balance */}
          </Link>
          {scopedDomain?.name && (
            <>
              <span className="text-sap-grey-1">/</span>
              <span className="font-semibold text-lg text-sap-grey-2">{scopedDomain.name}</span>
            </>
          )}
          {scopedProject?.name && (
            <>
              <span className="text-sap-grey-1">/</span>
              <span className="font-semibold text-lg text-sap-grey-2">{scopedProject.name}</span>
            </>
          )}
        </div>

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
