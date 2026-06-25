import { useState, useCallback, useEffect, useRef } from "react"
import { createFileRoute, redirect, useRouterState } from "@tanstack/react-router"
import { useAuth } from "../store/AuthProvider"
import { z } from "zod"
import { trpcClient } from "../trpcClient"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button, ContentHeading, Message } from "@cloudoperators/juno-ui-components"
import { useErrorTranslation } from "../utils/useErrorTranslation"

function isSafeRedirect(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//")
}

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    redirect: z.string().optional().catch(""),
  }),
  beforeLoad: async ({ context, search }) => {
    let isAuthenticated = context.auth?.isAuthenticated

    if (!isAuthenticated && context.trpcClient) {
      try {
        const token = await context.trpcClient.auth.getCurrentUserSession.query()
        if (token) {
          context.auth?.login(token.user, token.expires_at)
          isAuthenticated = true
        }
      } catch {
        // Session probe failed — treat as unauthenticated so the login route can render
      }
    }

    if (isAuthenticated) {
      const savedRedirect = sessionStorage.getItem("redirect_after_login")

      let redirectTo = `/projects`

      if (isSafeRedirect(savedRedirect)) {
        redirectTo = savedRedirect
      } else if (isSafeRedirect(search.redirect)) {
        redirectTo = search.redirect
      }

      sessionStorage.removeItem("redirect_after_login")
      throw redirect({ to: redirectTo })
    }
  },
  component: AuthLoginPage,
})

const textinputstyles = `
  jn-bg-theme-textinput
  jn-text-theme-textinput
  jn-text-base
  jn-leading-4
  jn-px-4
  jn-h-textinput
  jn-rounded-3px
  focus:jn-outline-none
  focus:jn-ring-2
  focus:jn-ring-theme-focus
  disabled:jn-opacity-50
  autofill:jn-bg-theme-textinput-autofill
  autofill:jn-text-theme-textinput-autofill
  peer
`

export function AuthLoginPage() {
  const { isAuthenticated, login, logoutReason } = useAuth()
  const isLoading = useRouterState({ select: (s) => s.isLoading })
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const [form, setForm] = useState({ domainName: "", user: "", password: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const skipAutoRedirectRef = useRef(false)

  const signin = useCallback(async () => {
    setIsSubmitting(true)
    setLoginError(null)

    try {
      const token = await trpcClient.auth.createUserSession.mutate(form)

      await login(token.user, token.expires_at)

      const savedRedirect = sessionStorage.getItem("redirect_after_login")
      const searchRedirect = search.redirect
      const defaultRedirect = `/projects`

      let redirectTo = defaultRedirect

      if (isSafeRedirect(savedRedirect)) {
        redirectTo = savedRedirect
      } else if (isSafeRedirect(searchRedirect)) {
        redirectTo = searchRedirect
      }

      sessionStorage.removeItem("redirect_after_login")
      skipAutoRedirectRef.current = true

      await navigate({
        to: redirectTo,
        replace: true,
      })
    } catch (error) {
      await login(null)
      console.error("Error logging in: ", error)

      // Check if this is a tRPC UNAUTHORIZED error (401)
      const isTRPCUnauthorized =
        error &&
        typeof error === "object" &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "code" in error.data &&
        error.data.code === "UNAUTHORIZED"

      let errorMessage: string
      if (
        isTRPCUnauthorized &&
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        errorMessage = error.message || t`Invalid credentials. Please check your domain, username, and password.`
      } else {
        errorMessage =
          error && typeof error === "object" && "message" in error && typeof error.message === "string"
            ? translateError(error.message)
            : t`Login failed. Please check your credentials and try again.`
      }

      setLoginError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [form, login, navigate, search.redirect, t, translateError])

  const dismissError = () => {
    setLoginError(null)
  }

  // Redirect effect: Handle race condition where isAuthenticated becomes true after component mounts
  // (e.g., during login flow). The beforeLoad guard handles direct navigation to / while
  // already authenticated, but this effect handles the case where authentication completes mid-render.
  useEffect(() => {
    if (!isAuthenticated || isLoading) return

    if (skipAutoRedirectRef.current) {
      skipAutoRedirectRef.current = false
      return
    }

    const savedRedirect = sessionStorage.getItem("redirect_after_login")
    const searchRedirect = search.redirect

    let redirectTo = `/projects`

    if (isSafeRedirect(savedRedirect)) {
      redirectTo = savedRedirect
    } else if (isSafeRedirect(searchRedirect)) {
      redirectTo = searchRedirect
    }

    sessionStorage.removeItem("redirect_after_login")

    navigate({
      to: redirectTo,
      replace: true,
    })
  }, [isAuthenticated, isLoading, search.redirect, navigate])

  const isLoggingIn = isLoading || isSubmitting

  const wasInactive = logoutReason === "inactive" || logoutReason === "expired"

  return (
    <div className="mt-8 flex justify-center">
      <div className="border-theme-light relative w-full max-w-md rounded-lg border p-6 shadow-lg">
        {loginError && (
          <Message
            onDismiss={dismissError}
            text={loginError}
            variant="error"
            className="absolute -top-14 right-0 left-0 z-50"
          />
        )}
        <ContentHeading className="text-center">
          <Trans>Login to Your Account</Trans>
        </ContentHeading>
        <p className="mb-6 text-center">
          <Trans>Enter your credentials to access your account</Trans>
        </p>
        {(search.redirect || wasInactive) && (
          <p className="mb-4 text-center text-sm text-red-500">
            {wasInactive ? (
              <Trans>Your session expired. Please login again.</Trans>
            ) : (
              <Trans>You need to login to access this page.</Trans>
            )}
          </p>
        )}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            signin()
          }}
        >
          <div className="flex flex-col">
            <label htmlFor="domain" className="font-medium text-gray-300">
              <Trans>Domain</Trans>
            </label>
            <input
              id="domain"
              type="text"
              placeholder={t`Enter your domain`}
              className={textinputstyles}
              onChange={(e) => {
                setForm({ ...form, domainName: e.target.value })
                if (loginError) setLoginError(null)
              }}
              required
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="user" className="font-medium text-gray-300">
              <Trans>User C/D/I</Trans>
            </label>
            <input
              id="user"
              type="text"
              placeholder={t`Enter your username`}
              className={textinputstyles}
              onChange={(e) => {
                setForm({ ...form, user: e.target.value })
                if (loginError) setLoginError(null)
              }}
              required
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="password" className="font-medium text-gray-300">
              <Trans>Password</Trans>
            </label>
            <input
              id="password"
              type="password"
              required
              className={textinputstyles}
              onChange={(e) => {
                setForm({ ...form, password: e.target.value })
                if (loginError) setLoginError(null)
              }}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoggingIn}>
            {isLoggingIn ? <Trans>Loading...</Trans> : <Trans>Sign In</Trans>}
          </Button>
        </form>
      </div>
    </div>
  )
}
