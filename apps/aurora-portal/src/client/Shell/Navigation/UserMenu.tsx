import { useLocation } from "wouter"
import { Button, Icon } from "@cloudoperators/juno-ui-components"
import { useAuth } from "../../Shell/AuthProvider"

export function UserMenu() {
  const { user, isLoading, logout } = useAuth()

  const setLocation = useLocation()[1]

  const login = () => {
    setLocation("/auth/signin")
  }

  return (
    <div className="mt-5 pt-5 w-24 flex justify-center items-center">
      {user ? (
        <div className="flex flex-col items-center">
          <Icon color="jn-global-text" icon="accountCircle" />
          <div className="mt-1 mb-3">{user?.name}</div>
          <Button disabled={isLoading} variant="default" size="small" onClick={logout}>
            Sign Out
          </Button>
        </div>
      ) : (
        <Button disabled={isLoading} variant="primary" size="small" onClick={login} className="mr-2 ml-2">
          Sign In
        </Button>
      )}
    </div>
  )
}
