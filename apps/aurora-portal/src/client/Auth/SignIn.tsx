import { useState } from "react"
import { ButtonRow, Button, Form, FormRow, TextInput, Spinner } from "@cloudoperators/juno-ui-components"
import { useAuth } from "../Shell/AuthProvider"

export function SignIn() {
  const [form, setForm] = useState({ domainName: "", user: "", password: "" })
  const { isAuthenticated, user, error, isLoading, login } = useAuth()

  if (isLoading)
    return (
      <div>
        <Spinner /> Loading...
      </div>
    )

  if (isAuthenticated)
    return (
      <div className="signed-in-notice">
        <strong>Welcome back, {user?.name}!</strong> <br />
        You are already signed in.
      </div>
    )

  return (
    <div className="w-80">
      <Form title="Sign In">
        {error && <div className="text-theme-error mt-2 mb-3">Error: {error}</div>}

        <FormRow>
          <TextInput
            label="Domain"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, domainName: e.target.value })}
          />
        </FormRow>
        <FormRow>
          <TextInput
            label="User C/D/I"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, user: e.target.value })}
          />
        </FormRow>
        <FormRow>
          <TextInput
            label="Password"
            required
            type="password"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && login(form)}
          />
        </FormRow>
        <ButtonRow>
          <Button variant="primary" onClick={() => login(form)}>
            Sign in
          </Button>
        </ButtonRow>
      </Form>
    </div>
  )
}
