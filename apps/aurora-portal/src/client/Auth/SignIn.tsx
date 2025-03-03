import { useState } from "react"
import { ButtonRow, Button, Form, FormRow, TextInput, Spinner } from "@cloudoperators/juno-ui-components"
import { useAuth } from "../Shell/AuthProvider"

export function SignIn() {
  const [form, setForm] = useState({ domainName: "", user: "", password: "" })
  const { isAuthenticated, user, error, isLoading, login } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-theme-background">
        <Spinner /> <span className="ml-2 text-sm text-theme-text-muted">Loading...</span>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-theme-background">
        <div className="max-w-md w-full text-center bg-theme-surface shadow-lg rounded-lg p-6 border border-theme-border">
          <h2 className="text-xl font-semibold text-theme-text">Welcome back, {user?.name}!</h2>
          <p className="text-theme-text-muted">You are already signed in.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-theme-background">
      <div className="w-full max-w-md bg-theme-surface shadow-lg rounded-lg p-6 border border-theme-border">
        <h2 className="text-2xl font-semibold text-center text-theme-text mb-4">Sign In</h2>
        <p className="text-theme-text-muted text-center text-sm mb-6">Enter your credentials to access your account</p>

        {error && <div className="text-theme-error text-sm mb-4 text-center">Error: {error}</div>}

        <Form>
          <FormRow>
            <TextInput
              label="Domain"
              placeholder="Enter your domain"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, domainName: e.target.value })}
            />
          </FormRow>
          <FormRow>
            <TextInput
              label="User C/D/I"
              placeholder="Enter your username"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, user: e.target.value })}
            />
          </FormRow>
          <FormRow>
            <TextInput
              label="Password"
              required
              type="password"
              placeholder="••••••••"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && login(form)}
            />
          </FormRow>

          <ButtonRow className="mt-4">
            <Button variant="primary" className="w-full">
              Sign In
            </Button>
          </ButtonRow>
        </Form>

        <p className="text-center text-sm text-theme-text-muted mt-4">
          Need help?{" "}
          <a href="#" className="text-theme-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  )
}
