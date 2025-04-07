import { useCallback, useState } from "react"
import { Button } from "../components/Button"
import { useAuth, useAuthDispatch } from "../store/StoreProvider"
import { TrpcClient } from "../trpcClient"
import { Trans } from "@lingui/react/macro"
import { useLingui } from "@lingui/react/macro"

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

export function SignIn(props: { trpcClient: TrpcClient["auth"] }) {
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated, user, error } = useAuth()
  const dispatch = useAuthDispatch()
  const [form, setForm] = useState({ domainName: "", user: "", password: "" })

  // example
  const { t, i18n } = useLingui()
  const random = Math.random()
  const example = t`It is:${i18n.date(new Date())} random: ${random}`

  const login = useCallback(() => {
    setIsLoading(true)
    props.trpcClient.createUserSession
      .mutate(form)
      .then((token) => {
        dispatch({ type: "LOGIN_SUCCESS", payload: { user: token?.user, sessionExpiresAt: token?.expires_at } })
      })
      .catch((error) => {
        let translatedError
        if (error.message.includes("Failed to execute 'json' on 'Response': Unexpected end of JSON input")) {
          translatedError = t`Failed to execute 'json' on 'Response': Unexpected end of JSON input`
        } else {
          translatedError = t`An unexpected error occurred: ${error.message}`
        }
        dispatch({ type: "LOGIN_FAILURE", payload: { error: translatedError } })
      })
      .finally(() => setIsLoading(false))
  }, [form])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="animate-spin w-6 h-6 border-4 border-gray-300 border-t-blue-600 rounded-full"></span>
        <span className="ml-2 text-sm text-gray-500">Auth...</span>
      </div>
    )
  }

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
          <Trans>Login to Your Account {example}</Trans>
        </h2>
        <p className="text-gray-400 text-center text-sm mb-6">
          <Trans>Enter your credentials to access your account</Trans>
        </p>

        {error && (
          <div className="text-red-500 text-sm mb-4 text-center">
            <Trans>Error: {error}</Trans>
          </div>
        )}

        <form className="space-y-4">
          {/* Domain Input */}
          <div className="flex flex-col">
            <label htmlFor="domain" className="text-gray-300 font-medium">
              Domain
            </label>
            <input
              id="domain"
              type="text"
              placeholder="Enter your domain"
              className={textinputstyles}
              onChange={(e) => setForm({ ...form, domainName: e.target.value })}
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
              placeholder="Enter your username"
              className={textinputstyles}
              onChange={(e) => setForm({ ...form, user: e.target.value })}
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
              placeholder="••••••••"
              required
              className={textinputstyles}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyUp={(e) => e.key === "Enter" && login()}
            />
          </div>

          {/* Sign In Button */}
          <Button
            disabled={isLoading}
            className="w-full"
            onClick={(e) => {
              e.preventDefault()
              login()
            }}
          >
            <Trans>Sign In</Trans>
          </Button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-4">
          <Trans>Need help? </Trans>
          <a href="#" className="text-blue-500 hover:underline">
            <Trans>Contact support</Trans>
          </a>
        </p>
      </div>
    </div>
  )
}
