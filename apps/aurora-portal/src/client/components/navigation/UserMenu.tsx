import { trpcClient } from "../../trpcClient"
import {
  PopupMenu,
  PopupMenuOptions,
  PopupMenuItem,
  PopupMenuSection,
  PopupMenuSectionHeading,
  PopupMenuSectionSeparator,
} from "@cloudoperators/juno-ui-components"
import { useAuth } from "../../store/AuthProvider"
import { useNavigate } from "@tanstack/react-router"
import { SessionExpirationTimer } from "../Auth/SessionExpirationTimer"
import { useState } from "react"

export function UserMenu() {
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated, user, logout, expiresAt } = useAuth()
  const navigate = useNavigate()

  const handleLogin = () => {
    navigate({ to: "/auth/login" })
  }

  const handleLogout = async () => {
    setIsLoading(true)
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

  return (
    <PopupMenu icon="accountCircle">
      <PopupMenuOptions>
        {isAuthenticated ? (
          <>
            <PopupMenuSection>
              <PopupMenuSectionHeading>
                <div className="font-semibold">{user?.name}</div>
                {user?.domain?.name && <div className="text-xs opacity-60">{user.domain.name}</div>}
              </PopupMenuSectionHeading>
            </PopupMenuSection>
            <PopupMenuSectionSeparator />
            <PopupMenuSection>
              <PopupMenuItem
                icon="exitToApp"
                label={isLoading ? "Signing out…" : "Log Out"}
                disabled={isLoading}
                onClick={handleLogout}
              />
              {expiresAt && (
                <PopupMenuSectionHeading>
                  <SessionExpirationTimer sessionExpired={expiresAt} logout={() => logout("expired")} />
                </PopupMenuSectionHeading>
              )}
            </PopupMenuSection>
          </>
        ) : (
          <PopupMenuSection>
            <PopupMenuItem icon="manageAccounts" label="Sign In" onClick={handleLogin} />
          </PopupMenuSection>
        )}
      </PopupMenuOptions>
    </PopupMenu>
  )
}
