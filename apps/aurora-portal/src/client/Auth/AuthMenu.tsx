import { useState } from "react"
import { useLocation } from "wouter"
import { TrpcClient } from "../trpcClient"
import { Button } from "@cloudoperators/juno-ui-components"
import { SessionExpirationTimer } from "./SessionExpirationTimer"
import { useAuth, useAuthDispatch } from "../store/StoreProvider"
import { useCallback } from "react"

export function AuthMenu(props: { authClient: TrpcClient["auth"] }) {
  const [isLoading, setIsLoading] = useState(false)
  const setLocation = useLocation()[1]
  const { isAuthenticated, user, sessionExpiresAt } = useAuth()
  const dispatch = useAuthDispatch()

  const login = () => {
    setLocation("/auth/signin")
  }

  const logout = useCallback(() => {
    setIsLoading(true)
    props.authClient.terminateUserSession
      .mutate()
      .then(() => {
        dispatch({ type: "LOGOUT" })
        setIsLoading(false)
        setLocation("/")
      })
      .catch((e: Error) => dispatch({ type: "LOGIN_FAILURE", payload: { error: e.message } }))
  }, [])

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center">
        <div className="mt-1 mb-3 text-sm font-medium">{user?.name}</div>
        <Button disabled={isLoading} variant="default" size="small" onClick={logout}>
          Sign Out
        </Button>
        {sessionExpiresAt && <SessionExpirationTimer passwordExpiresAt={sessionExpiresAt} logout={logout} />}
      </div>
    )
  }

  return (
    <Button disabled={isLoading} variant="primary" size="small" onClick={login} className="w-full">
      Sign In
    </Button>
  )
}
