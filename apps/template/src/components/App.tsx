import React from "react"
import { AppShellProvider, AppShell, FormattedText } from "@cloudoperators/juno-ui-components"

export default function App() {
  return (
    <AppShellProvider stylesWrapper="head" shadowRoot={false}>
      <AppShell pageHeader="Aurora Template">
        <FormattedText className="p-5">
          <h1>Welcome to Aurora Template</h1>
          <p>
            Welcome to the Aurora Template App — your starting point for creating powerful, customized applications with
            ease. This template is part of our monorepo, designed to streamline the process of generating new apps and
            maintaining consistency across projects.
          </p>
        </FormattedText>
      </AppShell>
    </AppShellProvider>
  )
}
