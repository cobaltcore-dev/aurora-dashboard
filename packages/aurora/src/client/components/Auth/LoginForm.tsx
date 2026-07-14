import { ContentHeading, Message, Button } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { useAuth } from "../../store/AuthProvider"

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

export function LoginForm({ afterLogin }: { afterLogin: () => Promise<void> }) {
  const { t } = useLingui()
  const { isLoading, error: loginError, login } = useAuth()

  return (
    <div className="mt-8 flex justify-center">
      <div className="border-theme-light relative w-full max-w-md rounded-lg border p-6 shadow-lg">
        {loginError && <Message text={loginError} variant="error" className="absolute -top-14 right-0 left-0 z-50" />}
        <ContentHeading className="text-center">
          <Trans>Login to Your Account</Trans>
        </ContentHeading>
        <p className="mb-6 text-center">
          <Trans>Enter your credentials to access your account</Trans>
        </p>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            console.log("====", {
              domain: formData.get("domain") as string,
              user: formData.get("user") as string,
              password: formData.get("password") as string,
            })
            login({
              domain: formData.get("domain") as string,
              user: formData.get("user") as string,
              password: formData.get("password") as string,
            }).then(({ success }) => {
              if (success) {
                console.log(afterLogin)
                afterLogin()
              }
            })
          }}
        >
          <div className="flex flex-col">
            <label htmlFor="domain" className="font-medium text-gray-300">
              <Trans>Domain</Trans>
            </label>
            <input
              id="domain"
              name="domain"
              type="text"
              placeholder={t`Enter your domain`}
              className={textinputstyles}
              required
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="user" className="font-medium text-gray-300">
              <Trans>User C/D/I</Trans>
            </label>
            <input
              id="user"
              name="user"
              type="text"
              placeholder={t`Enter your username`}
              autoComplete="username"
              className={textinputstyles}
              required
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="password" className="font-medium text-gray-300">
              <Trans>Password</Trans>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={textinputstyles}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Trans>Loading...</Trans> : <Trans>Sign In</Trans>}
          </Button>
        </form>
      </div>
    </div>
  )
}
