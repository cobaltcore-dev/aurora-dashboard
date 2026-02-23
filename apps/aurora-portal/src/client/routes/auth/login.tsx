import { useState, useCallback } from "react"
import { createFileRoute, redirect, useRouterState } from "@tanstack/react-router"
import { useAuth } from "../../store/AuthProvider"
import { z } from "zod"
import { trpcClient } from "../../trpcClient"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button, ContentHeading, Message } from "@cloudoperators/juno-ui-components"
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
      <div className="border-theme-light mt-8 w-full max-w-md justify-center rounded-lg border p-6 shadow-lg">
        <h2 className="text-xl font-semibold">
          <Trans>Welcome back, {username}!</Trans>
        </h2>
        <Trans>You are already signed in.</Trans>
      </div>
    )
  }

  const logoutReason = sessionStorage.getItem("logout_reason")
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
              onKeyUp={(e) => e.key === "Enter" && signin()}
            />
          </div>

          <Button
            className="w-full"
            disabled={isLoggingIn}
            onClick={(e) => {
              e.preventDefault()
              signin()
            }}
          >
            {isLoggingIn ? <Trans>Loading...</Trans> : <Trans>Sign In</Trans>}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Trans>Need help?</Trans>{" "}
          <a href="#">
            <Trans>Contact support</Trans>
          </a>
        </p>
      </div>
    </div>
  )
}
