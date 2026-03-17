import { useState, useCallback } from "react"
import { createFileRoute, redirect, useRouterState } from "@tanstack/react-router"
import { useAuth } from "../../store/AuthProvider"
import { z } from "zod"
import { trpcClient } from "../../trpcClient"
import { Trans, useLingui } from "@lingui/react/macro"
import {
  Button,
  ContentHeading,
  TextInput,
  Container,
  Stack,
  Message,
  SignInForm,
  FormRow,
} from "@cloudoperators/juno-ui-components"
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

  const isLoggingIn = isLoading || isSubmitting

  if (isAuthenticated) {
    const username = user?.name
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Container className="w-full max-w-md p-8">
          <Stack gap="4" direction="vertical" alignment="center">
            <h2 className="text-2xl font-semibold">
              <Trans>Welcome back, {username}!</Trans>
            </h2>
            <p className="text-theme-light">
              <Trans>You are being redirected to your projects...</Trans>
            </p>
          </Stack>
        </Container>
      </div>
    )
  }

  const logoutReason = sessionStorage.getItem("logout_reason")
  const wasInactive = logoutReason === "inactive" || logoutReason === "expired"

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Container className="relative w-full max-w-md p-8 sm:p-10">
        <Stack gap="8" direction="vertical">
          <Stack gap="3" direction="vertical" alignment="center">
            <ContentHeading className="text-center text-4xl font-bold tracking-tight">
              <Trans>Welcome to Aurora</Trans>
            </ContentHeading>
            <p className="text-theme-light text-center text-base">
              <Trans>Sign in to continue to your account</Trans>
            </p>
          </Stack>

          {loginError && <Message className="text-sm" variant="error" text={loginError} />}
          {!loginError && wasInactive && (
            <Message variant="warning" text={t`Your session expired. Please login again.`} className="text-sm" />
          )}

          <SignInForm
            title={false}
            onSubmit={(e) => {
              e.preventDefault()
              signin()
            }}
          >
            <FormRow>
              <TextInput
                id="domain"
                type="text"
                label={t`Domain`}
                placeholder={t`Enter your domain`}
                onChange={(e) => {
                  setForm({ ...form, domainName: e.target.value })
                  if (loginError) setLoginError(null)
                }}
                required
                autoComplete="organization"
              />
            </FormRow>

            <FormRow>
              <TextInput
                id="user"
                type="text"
                label={t`Username`}
                placeholder={t`Enter your username`}
                onChange={(e) => {
                  setForm({ ...form, user: e.target.value })
                  if (loginError) setLoginError(null)
                }}
                required
                autoComplete="username"
              />
            </FormRow>

            <FormRow>
              <TextInput
                id="password"
                type="password"
                label={t`Password`}
                required
                placeholder={t`Enter your password`}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value })
                  if (loginError) setLoginError(null)
                }}
                autoComplete="current-password"
              />
            </FormRow>

            <Button
              type="submit"
              variant="primary"
              className="mt-2 w-full py-3 text-base font-semibold"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? <Trans>Signing in...</Trans> : <Trans>Sign In</Trans>}
            </Button>
          </SignInForm>

          <div className="border-theme-background-lvl-3 border-t pt-6">
            <p className="text-theme-light text-center text-sm">
              <Trans>Need help?</Trans>{" "}
              <a
                href="https://github.com/cobaltcore-dev/aurora-dashboard/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Trans>Contact support</Trans>
              </a>
            </p>
          </div>
        </Stack>
      </Container>
    </div>
  )
}
