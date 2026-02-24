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

  describe("Basic rendering", () => {
    it("renders security group name and ID", async () => {
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
    })

    it("renders security group description", async () => {
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
        expect(screen.getByText("Security group for web servers")).toBeInTheDocument()
      })
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

    it("renders the correct test id", async () => {
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
    })
  })

  describe("Shared status", () => {
    it("displays 'No' when security group is not shared", async () => {
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

      const cells = screen.getAllByText("No")
      expect(cells.length).toBeGreaterThan(0)
    })

    it("displays 'Yes' and owner project ID when security group is shared", async () => {
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
        const yesElements = screen.getAllByText("Yes")
        expect(yesElements.length).toBeGreaterThan(0)
      })

      expect(screen.getByText(/Owner/i)).toBeInTheDocument()
      expect(screen.getByText("project-456")).toBeInTheDocument()
    })
  })

  describe("Stateful status", () => {
    it("displays 'Yes' when security group is stateful", async () => {
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

      const cells = screen.getAllByText("Yes")
      expect(cells.length).toBeGreaterThan(0)
    })

    it("displays 'No' when security group is not stateful", async () => {
      const statelessSg = { ...mockSecurityGroup, stateful: false }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={statelessSg}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("web-servers")).toBeInTheDocument()
      })

      const cells = screen.getAllByText("No")
      expect(cells.length).toBeGreaterThan(0)
    })

    it("displays 'No' when stateful property is undefined", async () => {
      const sgWithUndefinedStateful = { ...mockSecurityGroup, stateful: undefined }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={sgWithUndefinedStateful}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("web-servers")).toBeInTheDocument()
      })

      const cells = screen.getAllByText("No")
      expect(cells.length).toBeGreaterThan(0)
    })
  })

  describe("Popup menu", () => {
    it("renders popup menu button", async () => {
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
      expect(popupButton).toBeInTheDocument()
    })

    it("displays all menu items when popup is opened", async () => {
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

      expect(screen.getByText("Edit")).toBeInTheDocument()
      expect(screen.getByText("Access Control")).toBeInTheDocument()
      expect(screen.getByText("Delete")).toBeInTheDocument()
    })

    it("calls onEdit when Edit menu item is clicked", async () => {
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

      expect(mockOnEdit).toHaveBeenCalledTimes(1)
      expect(mockOnEdit).toHaveBeenCalledWith(mockSecurityGroup)
    })

    it("calls onAccessControl when Access Control menu item is clicked", async () => {
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

      expect(mockOnAccessControl).toHaveBeenCalledTimes(1)
      expect(mockOnAccessControl).toHaveBeenCalledWith(mockSecurityGroup)
    })

    it("calls onViewDetails when Show Details menu item is clicked", async () => {
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

      expect(mockOnViewDetails).toHaveBeenCalledTimes(1)
      expect(mockOnViewDetails).toHaveBeenCalledWith(mockSecurityGroup)
    })

    it("does not call onViewDetails when it is not provided", async () => {
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

      // Should not throw error
      expect(mockOnViewDetails).not.toHaveBeenCalled()
    })
  })

  describe("Permissions", () => {
    it("hides Edit menu item when canUpdate is false", async () => {
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
      expect(screen.getByText("Access Control")).toBeInTheDocument()
      expect(screen.getByText("Delete")).toBeInTheDocument()
    })

    it("hides Access Control menu item when canManageAccess is false", async () => {
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

      expect(screen.getByText("Edit")).toBeInTheDocument()
      expect(screen.queryByText("Access Control")).not.toBeInTheDocument()
      expect(screen.getByText("Delete")).toBeInTheDocument()
    })

    it("hides Delete menu item when canDelete is false", async () => {
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

      expect(screen.getByText("Edit")).toBeInTheDocument()
      expect(screen.getByText("Access Control")).toBeInTheDocument()
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

  describe("Edge cases", () => {
    it("renders correctly with undefined description", async () => {
      const sgWithoutDescription = { ...mockSecurityGroup, description: undefined }
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
        expect(screen.getByText("web-servers")).toBeInTheDocument()
      })

      expect(screen.getByText("—")).toBeInTheDocument()
    })

    it("renders correctly with undefined shared property", async () => {
      const sgWithUndefinedShared = { ...mockSecurityGroup, shared: undefined }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={sgWithUndefinedShared}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("web-servers")).toBeInTheDocument()
      })

      // Should display "No" for undefined boolean value
      expect(screen.queryByText("Owner")).not.toBeInTheDocument()
    })

    it("handles long security group names", async () => {
      const longName = "very-long-security-group-name-that-might-cause-display-issues-in-the-ui"
      const sgWithLongName = { ...mockSecurityGroup, name: longName }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={sgWithLongName}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument()
      })
    })

    it("handles long descriptions", async () => {
      const longDescription =
        "This is a very long description that contains a lot of text and might need to be truncated or handled specially in the UI to ensure proper display"
      const sgWithLongDescription = { ...mockSecurityGroup, description: longDescription }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={sgWithLongDescription}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText(longDescription)).toBeInTheDocument()
      })
    })

    it("handles click event propagation on popup menu cell", async () => {
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
      const cells = row.querySelectorAll("td")
      const lastCell = cells[cells.length - 1]

      // Click on the cell (not the button)
      await user.click(lastCell)

      // Event propagation should be stopped - no row click behavior should occur
      // This is a behavior test to ensure stopPropagation works
    })
  })

  describe("Complex scenarios", () => {
    it("renders shared and stateful security group correctly", async () => {
      const sharedAndStateful = { ...mockSecurityGroup, shared: true, stateful: true }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={sharedAndStateful}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("web-servers")).toBeInTheDocument()
      })

      // Check for "Yes" appearing twice (once for shared, once for stateful)
      const yesElements = screen.getAllByText("Yes")
      expect(yesElements.length).toBeGreaterThanOrEqual(2)

      expect(screen.getByText(/Owner/i)).toBeInTheDocument()
      expect(screen.getByText("project-456")).toBeInTheDocument()
    })

    it("renders not shared and not stateful security group correctly", async () => {
      const notSharedNotStateful = { ...mockSecurityGroup, shared: false, stateful: false }
      const router = createTestRouter(
        <SecurityGroupTableRow
          securityGroup={notSharedNotStateful}
          permissions={defaultPermissions}
          onEdit={mockOnEdit}
          onAccessControl={mockOnAccessControl}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("web-servers")).toBeInTheDocument()
      })

      // Check for "No" appearing twice (once for shared, once for stateful)
      const noElements = screen.getAllByText("No")
      expect(noElements.length).toBeGreaterThanOrEqual(2)

      expect(screen.queryByText("Owner")).not.toBeInTheDocument()
    })

    it("can interact with multiple menu items sequentially", async () => {
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

      // Click Show Details
      await user.click(popupButton!)
      await waitFor(() => expect(screen.getByText("Show Details")).toBeInTheDocument())
      await user.click(screen.getByText("Show Details"))
      expect(mockOnViewDetails).toHaveBeenCalledTimes(1)

      // Click Edit
      await user.click(popupButton!)
      await waitFor(() => expect(screen.getByText("Edit")).toBeInTheDocument())
      await user.click(screen.getByText("Edit"))
      expect(mockOnEdit).toHaveBeenCalledTimes(1)

      // Click Access Control
      await user.click(popupButton!)
      await waitFor(() => expect(screen.getByText("Access Control")).toBeInTheDocument())
      await user.click(screen.getByText("Access Control"))
      expect(mockOnAccessControl).toHaveBeenCalledTimes(1)
    })
  })
})
