import {
  PopupMenu,
  PopupMenuOptions,
  PopupMenuItem,
  PopupMenuSection,
  PopupMenuSectionHeading,
  PopupMenuSectionSeparator,
} from "@cloudoperators/juno-ui-components"
import { useAuth } from "../../store/AuthProvider"
import { SessionExpirationTimer } from "../Auth/SessionExpirationTimer"

export function UserMenu() {
  const { isAuthenticated, isLoading, user, logout, expiresAt } = useAuth()

  if (!isAuthenticated) return null

  return (
    <PopupMenu icon="accountCircle">
      <PopupMenuOptions>
        <PopupMenuSection>
          <PopupMenuSectionHeading>
            <div>User ID: {user?.name}</div>
            {user?.domain?.name && <div className="text-xs">User Domain: {user.domain.name}</div>}
          </PopupMenuSectionHeading>
        </PopupMenuSection>
        <PopupMenuSectionSeparator />
        <PopupMenuSection>
          <PopupMenuItem label={isLoading ? "Signing out…" : "Sign Out"} disabled={isLoading} onClick={logout} />
          {expiresAt && (
            <PopupMenuSectionHeading>
              <SessionExpirationTimer sessionExpired={expiresAt} />
            </PopupMenuSectionHeading>
          )}
        </PopupMenuSection>
      </PopupMenuOptions>
    </PopupMenu>
  )
}
