import { useState, useCallback } from "react"
import { createFileRoute, redirect, useRouterState } from "@tanstack/react-router"
import { useAuth } from "../../store/AuthProvider"
import { z } from "zod"
import { trpcClient } from "../../trpcClient"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button, Message, Icon } from "@cloudoperators/juno-ui-components"
import { useErrorTranslation } from "../../utils/useErrorTranslation"

export const Route = createFileRoute("/auth/login")({
  validateSearch: z.object({
    redirect: z.string().optional().catch(""),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth?.isAuthenticated) {
      const savedRedirect = sessionStorage.getItem("redirect_after_login")

      let redirectTo = `/accounts/${context.auth.user?.domain.id}/projects`

      if (savedRedirect && typeof savedRedirect === "string" && savedRedirect.startsWith("/")) {
        redirectTo = savedRedirect
      } else if (search.redirect && typeof search.redirect === "string" && search.redirect.startsWith("/")) {
        redirectTo = search.redirect
      }

      throw redirect({ to: redirectTo })
    }
    return {
      trpcClient: context.trpcClient,
      auth: context.auth,
    }
  },
  component: AuthLoginPage,
})

export function AuthLoginPage() {
  const { isAuthenticated, user, login } = useAuth()
  const isLoading = useRouterState({ select: (s) => s.isLoading })
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const { t } = useLingui()
  const { translateError } = useErrorTranslation()

  const [form, setForm] = useState({ domainName: "", user: "", password: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const signin = useCallback(async () => {
    setIsSubmitting(true)
    setLoginError(null)

    try {
      const token = await trpcClient.auth.createUserSession.mutate(form)

      await login(token.user, token.expires_at)

      const savedRedirect = sessionStorage.getItem("redirect_after_login")
      const searchRedirect = search.redirect
      const defaultRedirect = `/accounts/${token.user.domain.id}/projects`

      let redirectTo = defaultRedirect

      if (savedRedirect && typeof savedRedirect === "string" && savedRedirect.startsWith("/")) {
        redirectTo = savedRedirect
      } else if (searchRedirect && typeof searchRedirect === "string" && searchRedirect.startsWith("/")) {
        redirectTo = searchRedirect
      }

      sessionStorage.removeItem("redirect_after_login")
      sessionStorage.removeItem("logout_reason")

      await navigate({
        to: redirectTo,
        replace: true,
      })
    } catch (error) {
      await login(null)
      console.error("Error logging in: ", error)

      const errorMessage = (error as Error)?.message
        ? translateError((error as Error).message)
        : t`Login failed. Please check your credentials and try again.`

      setLoginError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }, [form, login, navigate, search.redirect, t, translateError])

  const dismissError = () => {
    setLoginError(null)
  }

  const isLoggingIn = isLoading || isSubmitting

  if (isAuthenticated) {
    const username = user?.name
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="bg-theme-background-lvl-1 border-theme-background-lvl-3 w-full max-w-md rounded-2xl border p-8 shadow-xl">
          <div className="mb-4 flex justify-center">
            <Icon icon="checkCircle" className="text-theme-success h-16 w-16" />
          </div>
          <h2 className="text-theme-highest mb-2 text-center text-2xl font-bold">
            <Trans>Welcome back, {username}!</Trans>
          </h2>
          <p className="text-theme-default text-center">
            <Trans>You are already signed in.</Trans>
          </p>
        </div>
      </div>
    )
  }

  const logoutReason = sessionStorage.getItem("logout_reason")
  const wasInactive = logoutReason === "inactive" || logoutReason === "expired"

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Gradient Background */}
      <div className="from-theme-background-lvl-0 via-theme-background-lvl-1 to-theme-background-lvl-2 absolute inset-0 bg-gradient-to-br" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="bg-theme-accent/5 absolute top-20 -left-4 h-72 w-72 rounded-full blur-3xl" />
        <div className="bg-theme-accent/5 absolute top-40 -right-4 h-96 w-96 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Error Message */}
          {loginError && (
            <div className="mb-4">
              <Message onDismiss={dismissError} text={loginError} variant="error" />
            </div>
          )}

          {/* Login Card */}
          <div className="bg-theme-background-lvl-1 border-theme-background-lvl-3 rounded-2xl border p-8 shadow-2xl">
            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-theme-highest mb-2 text-3xl font-bold">
                <Trans>Welcome to Aurora</Trans>
              </h1>
              <p className="text-theme-light text-sm">
                <Trans>Sign in to manage your cloud infrastructure</Trans>
              </p>
            </div>

            {/* Session expired warning */}
            {(search.redirect || wasInactive) && (
              <div className="bg-theme-warning/10 border-theme-warning/20 mb-6 rounded-lg border p-3">
                <p className="text-theme-warning text-center text-sm">
                  {wasInactive ? (
                    <Trans>Your session expired. Please login again.</Trans>
                  ) : (
                    <Trans>You need to login to access this page.</Trans>
                  )}
                </p>
              </div>
            )}

            {/* Login Form */}
            <form
              className="space-y-5"
              onSubmit={(e) => {
                e.preventDefault()
                signin()
              }}
            >
              {/* Domain Field */}
              <div>
                <label htmlFor="domain" className="text-theme-default mb-2 block text-sm font-medium">
                  <Trans>Domain</Trans>
                </label>
                <input
                  id="domain"
                  type="text"
                  placeholder={t`Enter your domain`}
                  className="bg-theme-textinput text-theme-textinput focus:ring-theme-focus w-full rounded-lg border-0 px-4 py-3 text-sm transition-shadow focus:ring-2 focus:outline-none disabled:opacity-50"
                  onChange={(e) => {
                    setForm({ ...form, domainName: e.target.value })
                    if (loginError) setLoginError(null)
                  }}
                  required
                  autoComplete="off"
                />
              </div>

              {/* Username Field */}
              <div>
                <label htmlFor="user" className="text-theme-default mb-2 block text-sm font-medium">
                  <Trans>Username</Trans>
                </label>
                <input
                  id="user"
                  type="text"
                  placeholder={t`Enter your username`}
                  className="bg-theme-textinput text-theme-textinput focus:ring-theme-focus w-full rounded-lg border-0 px-4 py-3 text-sm transition-shadow focus:ring-2 focus:outline-none disabled:opacity-50"
                  onChange={(e) => {
                    setForm({ ...form, user: e.target.value })
                    if (loginError) setLoginError(null)
                  }}
                  required
                  autoComplete="username"
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="text-theme-default mb-2 block text-sm font-medium">
                  <Trans>Password</Trans>
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder={t`Enter your password`}
                  className="bg-theme-textinput text-theme-textinput focus:ring-theme-focus w-full rounded-lg border-0 px-4 py-3 text-sm transition-shadow focus:ring-2 focus:outline-none disabled:opacity-50"
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value })
                    if (loginError) setLoginError(null)
                  }}
                  onKeyUp={(e) => e.key === "Enter" && signin()}
                  required
                  autoComplete="current-password"
                />
              </div>

              {/* Submit Button */}
              <Button
                variant="primary"
                className="hover:shadow-accent/50 w-full py-3 font-semibold shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl disabled:hover:scale-100"
                disabled={isLoggingIn}
                onClick={(e) => {
                  e.preventDefault()
                  signin()
                }}
              >
                {isLoggingIn ? <Trans>Signing in...</Trans> : <Trans>Sign In</Trans>}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-theme-light text-sm">
                <Trans>Need help?</Trans>{" "}
                <a
                  href="#"
                  className="text-theme-accent hover:text-theme-accent-emphasis font-medium transition-colors"
                >
                  <Trans>Contact support</Trans>
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
