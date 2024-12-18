import React from "react"
// @ts-expect-error types will be provided soon
import { AppShellProvider, AppShell, FormattedText, Button } from "@cloudoperators/juno-ui-components"
import { AuthForm } from "../Identity/Authentication/AuthForm"
import { useGetTokenQuery, useLogoutMutation } from "../generated/graphql"

export default function App() {
  const [showAuth, setShowAuth] = React.useState<boolean>(false)
  const { data, loading: authLoading, refetch } = useGetTokenQuery()
  const [logout] = useLogoutMutation()

  console.log("========================")
  console.log(data, authLoading)

  return (
    <AppShellProvider stylesWrapper="head" shadowRoot={false}>
      <AppShell pageHeader="Aurora Dashboard">
        <FormattedText className="p-5">
          <h1>Welcome to Aurora Dashboard</h1>
          {authLoading && <p>Loading...</p>}

          {data?.token ? (
            <>
              <h2>Hello {data.token?.user?.name}</h2>
              <p>
                <Button
                  onClick={() => {
                    logout().then(() => refetch())
                  }}
                >
                  Logout
                </Button>
              </p>
            </>
          ) : (
            <>
              <h2>Sign in to get started</h2>
              <Button onClick={() => setShowAuth(true)}>Sign in</Button>
            </>
          )}

          <AuthForm
            onSuccess={() => {
              refetch()
              setShowAuth(false)
            }}
            opened={showAuth}
          />

          <p>
            The <strong>Aurora Dashboard</strong> is on its way! Get ready for a powerful, all-in-one cloud management
            interface designed to make managing your cloud assets simple and efficient. With tools for provisioning,
            configuring, and scaling resources like servers, networks, and volumes, Aurora will soon bring you:
          </p>

          <ul>
            <li>
              <strong>Centralized Cloud Control</strong>: Manage all your assets from one intuitive interface.
            </li>
            <li>
              <strong>Efficient Resource Management</strong>: Provision, configure, and scale resources across cloud
              environments with ease.
            </li>
            <li>
              <strong>Enhanced Scalability</strong>: Seamlessly handle everything from small setups to complex,
              multi-cloud environments.
            </li>
          </ul>

          <p>Stay tuned—Aurora Dashboard is launching soon to streamline your cloud management experience!</p>
        </FormattedText>
      </AppShell>
    </AppShellProvider>
  )
}
