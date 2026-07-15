import { ContentHeading, Message, Button, FormRow, TextInput, Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import { useAuth } from "../../store/AuthProvider"

export function LoginForm() {
  const { isLoading, error: loginError, login } = useAuth()

  return (
    <Stack className="fixed inset-0" distribution="center" alignment="center">
      <div className="border-theme-light relative w-full max-w-md rounded-lg border p-6 shadow-lg">
        <ContentHeading className="text-center">
          <Trans>Login to Your Account</Trans>
        </ContentHeading>
        <p className="mb-6 text-center">
          <Trans>Enter your credentials to access your account</Trans>
        </p>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            login({
              domain: String(formData.get("domain") ?? ""),
              user: String(formData.get("user") ?? ""),
              password: String(formData.get("password") ?? ""),
            })
          }}
        >
          {loginError && <Message text={loginError} variant="error" />}
          <FormRow>
            <TextInput id="domain" name="domain" label="Domain" autoComplete="domain" required />
          </FormRow>
          <FormRow>
            <TextInput id="user" name="user" label="User" autoComplete="user" required />
          </FormRow>
          <FormRow>
            <TextInput
              id="password"
              name="password"
              type="password"
              label="Password"
              autoComplete="password"
              required
            />
          </FormRow>

          <Button type="submit" variant="primary" className="mt-2 w-full" disabled={isLoading}>
            {isLoading ? <Trans>Loading...</Trans> : <Trans>Sign In</Trans>}
          </Button>
        </form>
      </div>
    </Stack>
  )
}
