import { useState, useCallback } from "react"
import { createFileRoute, redirect, useRouter, useRouterState } from "@tanstack/react-router"
import { useAuth } from "../../store/AuthProvider"
import { z } from "zod"
import { trpcClient } from "../../trpcClient"
import { Trans, useLingui } from "@lingui/react/macro"
import { Button } from "@cloudoperators/juno-ui-components"

export const Route = createFileRoute("/auth/login")({
  validateSearch: z.object({
    redirect: z.string().optional().catch(""),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.auth?.isAuthenticated) {
      throw redirect({ to: search.redirect || `/accounts/${context.auth.user?.domain.id}/projects` })
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
  const router = useRouter()
  const isLoading = useRouterState({ select: (s) => s.isLoading })
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const { t } = useLingui()

  const [form, setForm] = useState({ domainName: "", user: "", password: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const signin = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const token = await trpcClient.auth.createUserSession.mutate(form)
      login(token.user, token.expires_at)
      // Wait for auth state to update before navigation
      await navigate({
        to: search.redirect || token.user.domain.id ? `/accounts/${token.user.domain.id}/projects` : "/",
      })
    } catch (error) {
      login(null)
      console.error("Error logging in: ", error)
    } finally {
      setIsSubmitting(false)
    }
  }, [form, router, navigate, search.redirect])

  const isLoggingIn = isLoading || isSubmitting

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md w-full text-center shadow-lg rounded-lg p-6 border border-gray-300">
          <h2 className="text-xl font-semibold">
            <Trans>Welcome back, {user?.name}!</Trans>
          </h2>
          <p className="text-gray-500">
            <Trans>You are already signed in.</Trans>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md shadow-lg rounded-lg p-6 border border-gray-700 bg-gray-900">
        <h2 className="text-2xl font-semibold text-center text-white mb-4">
          <Trans>Login to Your Account</Trans>
        </h2>
        <p className="text-gray-400 text-center text-sm mb-6">
          <Trans>Enter your credentials to access your account</Trans>
        </p>

        {search.redirect && (
          <p className="text-red-500 text-sm mb-4 text-center">
            <Trans>You need to login to access this page.</Trans>
          </p>
        )}

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            signin()
          }}
        >
          {/* Domain Input */}
          <div className="flex flex-col">
            <label htmlFor="domain" className="text-gray-300 font-medium">
              <Trans>Domain</Trans>
            </label>
            <input
              id="domain"
              type="text"
              placeholder={t`Enter your domain`}
              className={textinputstyles}
              onChange={(e) => setForm({ ...form, domainName: e.target.value })}
              required
            />
          </div>

          {/* User Input */}
          <div className="flex flex-col">
            <label htmlFor="user" className="text-gray-300 font-medium">
              <Trans>User C/D/I</Trans>
            </label>
            <input
              id="user"
              type="text"
              placeholder={t`Enter your username`}
              className={textinputstyles}
              onChange={(e) => setForm({ ...form, user: e.target.value })}
              required
            />
          </div>

          {/* Password Input */}
          <div className="flex flex-col">
            <label htmlFor="password" className="text-gray-300 font-medium">
              <Trans>Password</Trans>
            </label>
            <input
              id="password"
              type="password"
              required
              className={textinputstyles}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyUp={(e) => e.key === "Enter" && signin()}
            />
          </div>

          {/* Sign In Button */}
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

        <p className="text-center text-sm text-gray-400 mt-4">
          <Trans>Need help?</Trans>{" "}
          <a href="#" className="text-blue-500 hover:underline">
            <Trans>Contact support</Trans>
          </a>
        </p>
      </div>
    </div>
  )
}
