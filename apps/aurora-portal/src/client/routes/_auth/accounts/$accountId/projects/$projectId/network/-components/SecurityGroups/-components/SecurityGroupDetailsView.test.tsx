/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Juno contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { cleanup, render, screen } from "@testing-library/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { SecurityGroupDetailsView } from "./SecurityGroupDetailsView"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"

const mockSecurityGroup: SecurityGroup = {
  id: "sg-123",
  name: "web-servers",
  description: "Security group for web servers",
  project_id: "project-456",
  tenant_id: "tenant-789",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
  revision_number: 1,
  tags: [],
  stateful: true,
  shared: false,
  security_group_rules: [],
}

const createWrapper =
  () =>
  ({ children }: { children: React.ReactNode }) => (
    <I18nProvider i18n={i18n}>
      <PortalProvider>{children}</PortalProvider>
    </I18nProvider>
  )

describe("SecurityGroupDetailsView", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders all security group fields", () => {
    render(<SecurityGroupDetailsView securityGroup={mockSecurityGroup} />, { wrapper: createWrapper() })

    expect(screen.getByText("Security Group Basic Info")).toBeInTheDocument()
    expect(screen.getByText("sg-123")).toBeInTheDocument()
    expect(screen.getByText("web-servers")).toBeInTheDocument()
    expect(screen.getByText("Security group for web servers")).toBeInTheDocument()
    expect(screen.getByText("project-456")).toBeInTheDocument()
  })

  it("displays N/A for missing description", () => {
    const sgWithoutDescription = { ...mockSecurityGroup, description: null }
    render(<SecurityGroupDetailsView securityGroup={sgWithoutDescription} />, { wrapper: createWrapper() })

    expect(screen.getByText("N/A")).toBeInTheDocument()
  })

  it("formats dates correctly", () => {
    render(<SecurityGroupDetailsView securityGroup={mockSecurityGroup} />, { wrapper: createWrapper() })

    const expectedDate = new Date("2024-01-01T00:00:00Z").toLocaleDateString()
    expect(screen.getByText(expectedDate)).toBeInTheDocument()
  })
})
