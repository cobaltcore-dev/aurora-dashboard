import { useState, useRef } from "react"
import { Icon } from "@cloudoperators/juno-ui-components"
import { useAuth } from "../../store/AuthProvider"
import { trpcClient } from "../../trpcClient"
import { useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const relatedTarget = event.relatedTarget
    if (menuRef.current && !menuRef.current.contains(relatedTarget)) {
      setIsOpen(false)
    }
  }

  const handleLogout = async () => {
    setIsLoading(true)
    setIsOpen(false)
    try {
      await trpcClient.auth.terminateUserSession.mutate()
    } catch (error) {
      console.error("Error logging out: ", error)
    } finally {
      try {
        await logout("manual")
      } catch (error) {
        console.error("Error during logout: ", error)
      }
      setIsLoading(false)
      await navigate({ to: "/" })
    }
  }

  const handleLogin = () => {
    setIsOpen(false)
    navigate({ to: "/auth/login" })
  }

  if (!isAuthenticated) {
    return (
      <button onClick={handleLogin} disabled={isLoading} className="text-white transition-opacity hover:opacity-80">
        <Icon icon="accountCircle" className="h-8 w-8" />
      </button>
    )
  }

  return (
    <div className="relative" ref={menuRef} tabIndex={0} onBlur={handleBlur}>
      {/* User Avatar Button */}
      <button
        onClick={toggleMenu}
        className="flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-white/10"
      >
        <div className="flex items-center gap-2">
          <span className="hidden text-sm font-medium text-white md:block">{user?.name}</span>
          <Icon icon="expandMore" className="h-5 w-5 text-white" />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="bg-theme-background-lvl-2 border-theme-background-lvl-4 absolute right-0 z-50 mt-2 w-64 rounded-xl border shadow-xl">
          {/* User Info Header */}
          <div className="border-theme-background-lvl-4 flex items-center gap-3 border-b p-4">
            <div className="min-w-0 flex-1">
              <div className="text-theme-highest truncate font-semibold">{user?.name}</div>
              <div className="text-theme-light truncate text-sm">{user?.domain?.name}</div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {/* My Profile */}
            <button
              className="hover:bg-theme-background-lvl-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
              onClick={() => {
                setIsOpen(false)
                // Navigate to profile when route is available
              }}
            >
              <Icon icon="accountCircle" className="text-theme-default h-5 w-5" />
              <span className="text-theme-default font-medium">
                <Trans>My Profile</Trans>
              </span>
            </button>

            {/* Log Out */}
            <button
              className="hover:bg-theme-danger/10 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
              onClick={handleLogout}
              disabled={isLoading}
            >
              <Icon icon="exitToApp" className="text-theme-danger h-5 w-5" />
              <span className="text-theme-danger font-medium">
                <Trans>Log Out</Trans>
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
