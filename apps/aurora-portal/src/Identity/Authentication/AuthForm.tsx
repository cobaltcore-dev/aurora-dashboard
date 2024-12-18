import React from "react"
// @ts-expect-error types will be provided soon
import { Panel, PanelBody, Form, FormRow, TextInput, ButtonRow, Button } from "@cloudoperators/juno-ui-components"
import { useAuthenticationMutation, AuthenticationMutation } from "../../generated/graphql"

type IdentityToken = AuthenticationMutation["login"] | undefined
interface AuthPanelProps {
  onSuccess: (auth: IdentityToken | undefined) => void
  opened: boolean
}

export const AuthForm = ({ onSuccess, opened }: AuthPanelProps) => {
  const [login] = useAuthenticationMutation()
  const [form, setForm] = React.useState({ domain: "", username: "", password: "" })

  const signin = async () => {
    const { data } = await login({
      variables: form,
    })

    onSuccess(data?.login)
  }

  return (
    <div>
      <Panel heading="Please Sign in" onClose={() => {}} opened={opened}>
        <PanelBody>
          Submit Hide code
          <Form title="Authentication">
            <FormRow>
              <TextInput
                id="domain"
                label="Domain"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, domain: e.target.value })}
              />
            </FormRow>
            <FormRow>
              <TextInput
                id="username"
                label="User C/D/I"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, username: e.target.value })}
              />
            </FormRow>
            <FormRow>
              <TextInput
                id="password"
                label="Password"
                required
                type="password"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && signin()}
              />
            </FormRow>
            <ButtonRow>
              <Button variant="primary" onClick={signin}>
                Sign in
              </Button>
            </ButtonRow>
          </Form>
        </PanelBody>
      </Panel>
    </div>
  )
}
