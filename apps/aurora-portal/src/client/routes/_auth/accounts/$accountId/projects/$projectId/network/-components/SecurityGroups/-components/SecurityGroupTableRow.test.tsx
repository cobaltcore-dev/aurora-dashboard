/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Juno contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactElement } from "react"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { createRoute, createRootRoute, RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import { SecurityGroupTableRow, SecurityGroupPermissions } from "./SecurityGroupTableRow"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"

const createTestRouter = (Component: ReactElement) => {
  const memoryHistory = createMemoryHistory({
    initialEntries: ["/accounts/test-account/projects/test-project/network/"],
  })

  const rootRoute = createRootRoute({
    component: () => (
      <I18nProvider i18n={i18n}>
        <PortalProvider>{Component}</PortalProvider>
      </I18nProvider>
    ),
  })

  const accountsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "accounts/$accountId",
  })

  const projectsRoute = createRoute({
    getParentRoute: () => accountsRoute,
    path: "projects/$projectId",
  })

  const networkRoute = createRoute({
    getParentRoute: () => projectsRoute,
    path: "network",
  })

  const routeTree = rootRoute.addChildren([accountsRoute.addChildren([projectsRoute.addChildren([networkRoute])])])

  return createRouter({
    routeTree,
    history: memoryHistory,
  })
}

describe("SecurityGroupTableRow", () => {
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

  const defaultPermissions: SecurityGroupPermissions = {
    canUpdate: true,
    canDelete: true,
    canManageAccess: true,
  }

  const mockOnEdit = vi.fn()
  const mockOnAccessControl = vi.fn()
  const mockOnViewDetails = vi.fn()

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders security group fields", async () => {
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={mockSecurityGroup}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("web-servers")).toBeInTheDocument()
      })

      expect(screen.getByText("sg-123")).toBeInTheDocument()
      expect(screen.getByText("Security group for web servers")).toBeInTheDocument()
    })

    it("renders em dash when description is missing", async () => {
      const sgWithoutDescription = { ...mockSecurityGroup, description: "" }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={sgWithoutDescription}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("—")).toBeInTheDocument()
      })
    })

    it("displays owner project when shared", async () => {
      const sharedSg = { ...mockSecurityGroup, shared: true }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={sharedSg}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText(/Owner/i)).toBeInTheDocument()
      })

      expect(screen.getByText("project-456")).toBeInTheDocument()
    })
  })

  describe("Menu actions", () => {
    it("calls onEdit when clicked", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={mockSecurityGroup}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-123")).toBeInTheDocument()
      })

      const row = screen.getByTestId("security-group-row-sg-123")
      const popupButton = row.querySelector("button")
      await user.click(popupButton!)

      await waitFor(() => {
        expect(screen.getByText("Edit")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Edit"))

      expect(mockOnEdit).toHaveBeenCalledWith(mockSecurityGroup)
    })

    it("calls onAccessControl when clicked", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={mockSecurityGroup}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-123")).toBeInTheDocument()
      })

      const row = screen.getByTestId("security-group-row-sg-123")
      const popupButton = row.querySelector("button")
      await user.click(popupButton!)

      await waitFor(() => {
        expect(screen.getByText("Access Control")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Access Control"))

      expect(mockOnAccessControl).toHaveBeenCalledWith(mockSecurityGroup)
    })

    it("calls onViewDetails when clicked", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={mockSecurityGroup}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
          onViewDetails={mockOnViewDetails}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-123")).toBeInTheDocument()
      })

      const row = screen.getByTestId("security-group-row-sg-123")
      const popupButton = row.querySelector("button")
      await user.click(popupButton!)

      await waitFor(() => {
        expect(screen.getByText("Show Details")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Show Details"))

      expect(mockOnViewDetails).toHaveBeenCalledWith(mockSecurityGroup)
    })

    it("handles missing onViewDetails gracefully", async () => {
      const user = userEvent.setup()
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={mockSecurityGroup}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-123")).toBeInTheDocument()
      })

      const row = screen.getByTestId("security-group-row-sg-123")
      const popupButton = row.querySelector("button")
      await user.click(popupButton!)

      await waitFor(() => {
        expect(screen.getByText("Show Details")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Show Details"))

      expect(mockOnViewDetails).not.toHaveBeenCalled()
    })
  })

  describe("Permissions", () => {
    it("hides Edit when canUpdate is false", async () => {
      const user = userEvent.setup()
      const permissions = { ...defaultPermissions, canUpdate: false }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={mockSecurityGroup}
          permissions={permissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-123")).toBeInTheDocument()
      })

      const row = screen.getByTestId("security-group-row-sg-123")
      const popupButton = row.querySelector("button")
      await user.click(popupButton!)

      await waitFor(() => {
        expect(screen.getByText("Show Details")).toBeInTheDocument()
      })

      expect(screen.queryByText("Edit")).not.toBeInTheDocument()
    })

    it("hides Access Control when canManageAccess is false", async () => {
      const user = userEvent.setup()
      const permissions = { ...defaultPermissions, canManageAccess: false }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={mockSecurityGroup}
          permissions={permissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-123")).toBeInTheDocument()
      })

      const row = screen.getByTestId("security-group-row-sg-123")
      const popupButton = row.querySelector("button")
      await user.click(popupButton!)

      await waitFor(() => {
        expect(screen.getByText("Show Details")).toBeInTheDocument()
      })

      expect(screen.queryByText("Access Control")).not.toBeInTheDocument()
    })

    it("hides Delete when canDelete is false", async () => {
      const user = userEvent.setup()
      const permissions = { ...defaultPermissions, canDelete: false }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={mockSecurityGroup}
          permissions={permissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-123")).toBeInTheDocument()
      })

      const row = screen.getByTestId("security-group-row-sg-123")
      const popupButton = row.querySelector("button")
      await user.click(popupButton!)

      await waitFor(() => {
        expect(screen.getByText("Show Details")).toBeInTheDocument()
      })

      expect(screen.queryByText("Delete")).not.toBeInTheDocument()
    })

    it("shows only Show Details when all permissions are false", async () => {
      const user = userEvent.setup()
      const permissions: SecurityGroupPermissions = {
        canUpdate: false,
        canDelete: false,
        canManageAccess: false,
      }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={mockSecurityGroup}
          permissions={permissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-123")).toBeInTheDocument()
      })

      const row = screen.getByTestId("security-group-row-sg-123")
      const popupButton = row.querySelector("button")
      await user.click(popupButton!)

      await waitFor(() => {
        expect(screen.getByText("Show Details")).toBeInTheDocument()
      })

      expect(screen.queryByText("Edit")).not.toBeInTheDocument()
      expect(screen.queryByText("Access Control")).not.toBeInTheDocument()
      expect(screen.queryByText("Delete")).not.toBeInTheDocument()
    })
  })
})
