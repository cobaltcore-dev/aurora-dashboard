import { useState } from "react"

import { TrpcClient } from "../../trpcClient"
import { Button } from "../Button"
import { SessionExpirationTimer } from "./SessionExpirationTimer"
import { useAuth, useAuthDispatch } from "../../store/StoreProvider"
import { useCallback } from "react"
import { useNavigate } from "@tanstack/react-router"

export function AuthMenu(props: { authClient: TrpcClient["auth"] }) {
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated, user, sessionExpiresAt } = useAuth()
  const dispatch = useAuthDispatch()
  const navigate = useNavigate()
  const login = () => {
    // @ts-expect-error we will redo this component and remove this error
    navigate("/auth/signin")
  }

  const logout = useCallback(() => {
    setIsLoading(true)
    props.authClient.terminateUserSession
      .mutate()
      .then(() => {
        dispatch({ type: "LOGOUT" })
        setIsLoading(false)
        // @ts-expect-error we will redo this component and remove this error
        navigate("/")
      })
      .catch((e: Error) => dispatch({ type: "LOGIN_FAILURE", payload: { error: e.message } }))
  }, [])

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center">
        <div className="mt-1 mb-3 text-sm font-medium">{user?.name}</div>
        <Button disabled={isLoading} variant="default" onClick={logout}>
          Sign Out
        </Button>
        {sessionExpiresAt && <SessionExpirationTimer passwordExpiresAt={sessionExpiresAt} logout={logout} />}
      </div>
    )
  }

  return (
    <Button disabled={isLoading} onClick={login} className="w-full">
      Sign In
    </Button>
  )
}
