import { useState } from "react"

import { TrpcClient } from "../../trpcClient"
import { Button } from "../Button"
// import { SessionExpirationTimer } from "./SessionExpirationTimer"
import { useAuth } from "../../store/AuthProvider"
import { useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"

export function AuthMenu(props: { authClient: TrpcClient["auth"] }) {
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  const login = () => {
    navigate({ to: "/auth/login" })
  }

  const signout = useCallback(async () => {
    try {
      await props.authClient.terminateUserSession.mutate()
      logout()

      // Wait for auth state to update before navigation
      await navigate({ to: "/" })
    } catch (error) {
      console.error("Error logginout in: ", error)
    } finally {
      setIsLoading(false)
      logout()
    }
  }, [navigate])

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center">
        <div className="mt-1 mb-3 text-sm font-medium">{user?.name}</div>
        <Button disabled={isLoading} variant="default" onClick={signout}>
          Sign Out
        </Button>
        {/* {sessionExpiresAt && <SessionExpirationTimer passwordExpiresAt={sessionExpiresAt} logout={signout} />} */}
      </div>
    )
  }

  return (
    <Button disabled={isLoading} onClick={login} className="w-full">
      Sign In
    </Button>
  )
}
