import { useState } from "react"
import type { AuroraReactQueryRouter } from "../../../../polaris-bff/routers"
// @ts-expect-error missing types
import { ButtonRow, Button, Form, FormRow, TextInput } from "@cloudoperators/juno-ui-components"
import { useLocation } from "wouter"

export function SignIn(props: { api: AuroraReactQueryRouter["identity"] }) {
  const [form, setForm] = useState({ domain: "", user: "", password: "" })
  const { api } = props
  const tokenMutation = api.login.useMutation()
  const setLocation = useLocation()[1]
  const checkLoginStatus = api.getAuthStatus.useQuery()

  const login = () => {
    tokenMutation.mutate({ user: form.user, password: form.password, domainName: form.domain })
  }
  if (checkLoginStatus.data?.isAuthenticated) {
    return (
      <div>
        <div>Already logged in</div>
        <div>Hi {checkLoginStatus.data?.user?.name}</div>
      </div>
    )
  }

  if (tokenMutation.isPending || checkLoginStatus.isPending) return <div>Loading...</div>
  if (tokenMutation.isError) return <div>Error: {tokenMutation.error.message}</div>
  if (tokenMutation.isSuccess) setLocation("/")
  return (
    <div className="w-80">
      <Form title="Sign In">
        <FormRow>
          <TextInput
            label="Domain"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, domain: e.target.value })}
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
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && login()}
          />
        </FormRow>
        <ButtonRow>
          <Button variant="primary" onClick={login}>
            Sign in
          </Button>
        </ButtonRow>
      </Form>
    </div>
  )
}
