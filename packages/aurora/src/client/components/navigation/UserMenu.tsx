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

export function UserMenu() {
  const { isAuthenticated, isLoading, user, logout, expiresAt } = useAuth()
  const navigate = useNavigate()

  const handleLogin = () => {
    navigate({ to: "/" })
  }

  const handleLogout = async () => {
    logout().finally(() => {
      navigate({ to: "/" })
    })
  }

  return (
    <PopupMenu icon="accountCircle">
      <PopupMenuOptions>
        {isAuthenticated ? (
          <>
            <PopupMenuSection>
              <PopupMenuSectionHeading>
                <div className="font-semibold">User ID: {user?.name}</div>
                {user?.domain?.name && <div className="text-xs opacity-60">User Domain: {user.domain.name}</div>}
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
                  <SessionExpirationTimer sessionExpired={expiresAt} />
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
