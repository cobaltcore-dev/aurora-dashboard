import { useState, useRef } from "react"
import { trpcClient } from "../../trpcClient"
import { Icon, Button } from "@cloudoperators/juno-ui-components"
import { useAuth } from "../../store/AuthProvider"
import { useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { SessionExpirationTimer } from "../Auth/SessionExpirationTimer"

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated, user, logout, expiresAt } = useAuth()
  const navigate = useNavigate()

  const handleLogin = () => {
    setIsOpen(false)
    navigate({ to: "/auth/login" })
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

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    // Check if the newly focused element is not within the menuRef
    const relatedTarget = event.relatedTarget // The element that will receive focus
    if (menuRef.current && !menuRef.current.contains(relatedTarget)) {
      setIsOpen(false) // Close the menu if the focus is outside
    }
  }

  return (
    <div className="relative" ref={menuRef} tabIndex={0} onBlur={handleBlur}>
      <button onClick={toggleMenu} className="align-middle">
        <Icon color="jn-global-text" icon="accountCircle" className="h-6 w-6" />
      </button>

      {isOpen && (
        <div className="bg-theme-background-lvl-2 border-theme-background-lvl-4 absolute right-0 z-50 mt-2 w-64 rounded-xl border shadow-xl">
          {isAuthenticated ? (
            <>
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
                {expiresAt && <SessionExpirationTimer sessionExpired={expiresAt} logout={() => logout("expired")} />}
              </div>
            </>
          ) : (
            <>
              <Button
                disabled={isLoading}
                onClick={handleLogin}
                className="hover:bg-theme-primary/10 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
              >
                <Icon icon="manageAccounts" className="h-5 w-5" />
                <span className="font-medium">
                  <Trans>Sign In</Trans>
                </span>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
