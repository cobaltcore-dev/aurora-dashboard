import { useState } from "react"
import { TrpcClient } from "../../trpcClient"
import { Button } from "@cloudoperators/juno-ui-components"
import { SessionExpirationTimer } from "./SessionExpirationTimer"
import { useAuth } from "../../store/AuthProvider"
import { useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"

export function AuthMenu(props: { authClient: TrpcClient["auth"] }) {
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated, user, logout, expiresAt } = useAuth()
  const navigate = useNavigate()

  const login = () => {
    navigate({ to: "/auth/login" })
  }

  const signout = useCallback(async () => {
    setIsLoading(true)
    try {
      await props.authClient.terminateUserSession.mutate()
    } catch (error) {
      console.error("Error logging out: ", error)
    } finally {
      await logout("manual")
      setIsLoading(false)
      await navigate({ to: "/" })
    }
  }, [props.authClient, logout, navigate])

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center">
        <div className="mt-1 mb-3 text-sm font-medium">{user?.name}</div>
        <Button disabled={isLoading} variant="default" size="small" onClick={signout}>
          <Trans>Sign Out</Trans>
        </Button>
        {expiresAt && <SessionExpirationTimer sessionExpired={expiresAt} logout={() => logout("expired")} />}
      </div>
    )
  }

  return (
    <Button disabled={isLoading} onClick={login} className="w-full">
      <Trans>Sign In</Trans>
    </Button>
  )
}
