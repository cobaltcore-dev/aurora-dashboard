import React from "react"
import {
  PortalProvider,
  Modal,
  ModalFooter,
  Message,
  Form,
  FormRow,
  TextInput,
  // @ts-expect-error types will be provided soon
} from "@cloudoperators/juno-ui-components"
import { useAuthenticationMutation } from "../../generated/graphql"

interface AuthPanelProps {
  onSuccess: () => void
  onCancel: () => void
  opened: boolean
}

export const AuthForm = ({ onSuccess, onCancel, opened }: AuthPanelProps) => {
  const [login] = useAuthenticationMutation()
  const [form, setForm] = React.useState({ domain: "", username: "", password: "" })
  const [error, setError] = React.useState<string | null>(null)

  const signin = () => {
    setError(null)
    login({
      variables: form,
    })
      .then(onSuccess)
      .catch((e) => setError(e.message))
  }

  return (
    <PortalProvider.Portal>
      <Modal
        initialFocus="#domain"
        modalFooter={
          <ModalFooter
            cancelButtonLabel="Never Mind"
            confirmButtonIcon="accountCircle"
            confirmButtonLabel="Log In"
            onCancel={onCancel}
            onConfirm={signin}
          />
        }
        onCancel={onCancel}
        onConfirm={signin}
        title="Sign In"
        open={opened}
      >
        {error && <Message onDismiss={() => {}} text={`Sign in failed. ${error}`} variant="warning" />}
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
        </Form>
      </Modal>
    </PortalProvider.Portal>
  )
}
