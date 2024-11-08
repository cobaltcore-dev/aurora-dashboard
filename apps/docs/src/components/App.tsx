import React from "react"
import { AppShellProvider, AppShell, FormattedText } from "@cloudoperators/juno-ui-components"

export default function App() {
  return (
    <AppShellProvider stylesWrapper="head" shadowRoot={false}>
      <AppShell pageHeader="Aurora Docs">
        <FormattedText className="p-5">
          <h1>Welcome to the Aurora Documentation Portal</h1>
          <p className="text-theme-accent">Coming Soon!</p>
          <p>
            Explore comprehensive guides, resources, and support to help you get the most out of <strong>Aurora</strong>
            . Our documentation portal will provide detailed insights and best practices for managing your cloud assets
            with the Aurora Dashboard. Soon, you’ll find everything you need to:
          </p>

          <ul>
            <li>
              <strong>Set Up Your Environment</strong>: Learn how to configure and prepare Aurora for seamless
              integration with your cloud setup.
            </li>
            <li>
              <strong>Efficiently Manage Resources</strong>: Access guides on provisioning, configuring, and scaling
              resources across various cloud environments.
            </li>
            <li>
              <strong>Optimize Your Workflow</strong>: Discover tips and tools for streamlining your cloud management
              processes, from basic setups to advanced, multi-cloud solutions.
            </li>
          </ul>

          <p>
            Stay tuned—Aurora Documentation Portal is launching soon to provide you with all the tools and knowledge you
            need for a successful cloud management experience!
          </p>
        </FormattedText>
      </AppShell>
    </AppShellProvider>
  )
}
