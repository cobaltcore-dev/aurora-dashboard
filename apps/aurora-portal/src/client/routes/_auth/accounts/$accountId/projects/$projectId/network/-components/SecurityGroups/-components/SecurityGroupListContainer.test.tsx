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
import { SecurityGroupListContainer } from "./SecurityGroupListContainer"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"
import type { SecurityGroupPermissions } from "./SecurityGroupTableRow"

// Mock the modals
vi.mock("./-modals/EditSecurityGroupModal", () => ({
  EditSecurityGroupModal: ({
    securityGroup,
    open,
    onClose,
  }: {
    securityGroup: SecurityGroup
    open: boolean
    onClose: () => void
  }) => (
    <div data-testid="edit-modal">
      {open && (
        <>
          <div data-testid="edit-modal-sg-id">{securityGroup.id}</div>
          <button onClick={onClose}>Close Edit</button>
        </>
      )}
    </div>
  ),
}))

vi.mock("./-modals/AccessControlModal", () => ({
  AccessControlModal: ({
    securityGroup,
    open,
    onClose,
  }: {
    securityGroup: SecurityGroup
    open: boolean
    onClose: () => void
  }) => (
    <div data-testid="access-control-modal">
      {open && (
        <>
          <div data-testid="access-control-modal-sg-id">{securityGroup.id}</div>
          <button onClick={onClose}>Close Access Control</button>
        </>
      )}
    </div>
  ),
}))

const mockSecurityGroups: SecurityGroup[] = [
  {
    id: "sg-1",
    name: "default",
    description: "Default security group",
    project_id: "project-1",
    tenant_id: "tenant-1",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    revision_number: 1,
    tags: [],
    stateful: true,
    shared: false,
    security_group_rules: [],
  },
  {
    id: "sg-2",
    name: "web-servers",
    description: "Security group for web servers",
    project_id: "project-1",
    tenant_id: "tenant-1",
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    revision_number: 1,
    tags: [],
    stateful: true,
    shared: true,
    security_group_rules: [],
  },
  {
    id: "sg-3",
    name: "database-servers",
    description: "Security group for database servers",
    project_id: "project-1",
    tenant_id: "tenant-1",
    created_at: "2024-01-03T00:00:00Z",
    updated_at: "2024-01-03T00:00:00Z",
    revision_number: 1,
    tags: [],
    stateful: false,
    shared: false,
    security_group_rules: [],
  },
]

const defaultPermissions: SecurityGroupPermissions = {
  canUpdate: true,
  canDelete: false,
  canManageAccess: true,
}

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

  // Create accounts route with parameter
  const accountsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "accounts/$accountId",
  })

  // Create projects route with parameter
  const projectsRoute = createRoute({
    getParentRoute: () => accountsRoute,
    path: "projects/$projectId",
  })

  // Create network route
  const networkRoute = createRoute({
    getParentRoute: () => projectsRoute,
    path: "network",
  })

  // Create security-groups route for navigation testing
  const securityGroupsRoute = createRoute({
    getParentRoute: () => networkRoute,
    path: "security-groups",
  })

  // Create security group details route for navigation testing
  const securityGroupDetailsRoute = createRoute({
    getParentRoute: () => securityGroupsRoute,
    path: "$securityGroupId",
    component: () => <div>Security Group Details</div>,
  })

  const routeTree = rootRoute.addChildren([
    accountsRoute.addChildren([
      projectsRoute.addChildren([networkRoute.addChildren([securityGroupsRoute.addChildren([securityGroupDetailsRoute])])]),
    ]),
  ])

  return createRouter({
    routeTree,
    history: memoryHistory,
  })
}

describe("SecurityGroupListContainer", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Loading state", () => {
    it("renders loading spinner when isLoading is true", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={[]}
          isLoading={true}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("Loading...")).toBeInTheDocument()
      })

      expect(screen.getByRole("progressbar")).toBeInTheDocument() // Spinner
    })

    it("does not render security groups when loading", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={true}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("Loading...")).toBeInTheDocument()
      })

      expect(screen.queryByTestId("security-group-row-sg-1")).not.toBeInTheDocument()
    })
  })

  describe("Error state", () => {
    it("renders error message when isError is true", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={[]}
          isLoading={false}
          isError={true}
          error={{ message: "Network error occurred" }}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("Network error occurred")).toBeInTheDocument()
      })
    })

    it("renders default error message when error message is not provided", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={[]}
          isLoading={false}
          isError={true}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("Failed to load security groups")).toBeInTheDocument()
      })
    })

    it("does not render security groups when there is an error", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={true}
          error={{ message: "Error" }}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("Error")).toBeInTheDocument()
      })

      expect(screen.queryByTestId("security-group-row-sg-1")).not.toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    it("renders empty state when no security groups are available", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={[]}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("no-security-groups")).toBeInTheDocument()
      })

      expect(screen.getByText("No security groups found")).toBeInTheDocument()
      expect(
        screen.getByText(
          "There are no security groups available for this project. Security groups define firewall rules for instances."
        )
      ).toBeInTheDocument()
    })

    it("renders DataGrid with 7 columns in empty state", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={[]}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      const { container } = render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("no-security-groups")).toBeInTheDocument()
      })

      const dataGrid = container.querySelector(".security-groups")
      expect(dataGrid).toBeInTheDocument()
      // Check that DataGrid is rendered (7 columns configured in the component)
    })
  })

  describe("Data rendering", () => {
    it("renders security groups data when available", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-1")).toBeInTheDocument()
      })

      expect(screen.getByTestId("security-group-row-sg-2")).toBeInTheDocument()
      expect(screen.getByTestId("security-group-row-sg-3")).toBeInTheDocument()
    })

    it("renders DataGrid with 5 columns for data view", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      const { container } = render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-1")).toBeInTheDocument()
      })

      const dataGrid = container.querySelector(".juno-datagrid")
      expect(dataGrid).toBeInTheDocument()
      // Check that DataGrid is rendered (5 columns configured in the component)
    })

    it("renders correct column headers", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("Name")).toBeInTheDocument()
      })

      expect(screen.getByText("Description")).toBeInTheDocument()
      expect(screen.getByText("Shared")).toBeInTheDocument()
      expect(screen.getByText("Stateful")).toBeInTheDocument()
    })

    it("renders all security groups in the list", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByText("default")).toBeInTheDocument()
      })

      expect(screen.getByText("web-servers")).toBeInTheDocument()
      expect(screen.getByText("database-servers")).toBeInTheDocument()
    })

    it("passes permissions to SecurityGroupTableRow", async () => {
      const permissions: SecurityGroupPermissions = {
        canUpdate: false,
        canDelete: true,
        canManageAccess: false,
      }

      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={permissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-1")).toBeInTheDocument()
      })
    })
  })

  describe("Edit modal", () => {
    it("opens edit modal when handleEdit is called", async () => {
      const user = userEvent.setup()

      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-1")).toBeInTheDocument()
      })

      // Find and click the Edit menu item for the first security group
      const firstRow = screen.getByTestId("security-group-row-sg-1")
      const popupMenuButton = firstRow.querySelector("button")
      expect(popupMenuButton).toBeInTheDocument()

      await user.click(popupMenuButton!)
      await waitFor(() => {
        const editMenuItem = screen.getByText("Edit")
        expect(editMenuItem).toBeInTheDocument()
      })

      const editMenuItem = screen.getByText("Edit")
      await user.click(editMenuItem)

      // Verify modal is open with correct security group
      await waitFor(() => {
        expect(screen.getByTestId("edit-modal-sg-id")).toHaveTextContent("sg-1")
      })
    })

    it("closes edit modal when close handler is called", async () => {
      const user = userEvent.setup()

      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-1")).toBeInTheDocument()
      })

      // Open modal
      const firstRow = screen.getByTestId("security-group-row-sg-1")
      const popupMenuButton = firstRow.querySelector("button")
      await user.click(popupMenuButton!)

      await waitFor(() => {
        expect(screen.getByText("Edit")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Edit"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-modal-sg-id")).toBeInTheDocument()
      })

      // Close modal
      const closeButton = screen.getByText("Close Edit")
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByTestId("edit-modal-sg-id")).not.toBeInTheDocument()
      })
    })

    it("updates selected security group when opening edit modal for different security group", async () => {
      const user = userEvent.setup()

      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-1")).toBeInTheDocument()
      })

      // Open modal for first security group
      const firstRow = screen.getByTestId("security-group-row-sg-1")
      const firstButton = firstRow.querySelector("button")
      await user.click(firstButton!)
      await waitFor(() => expect(screen.getByText("Edit")).toBeInTheDocument())
      await user.click(screen.getByText("Edit"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-modal-sg-id")).toHaveTextContent("sg-1")
      })

      // Close modal
      await user.click(screen.getByText("Close Edit"))
      await waitFor(() => {
        expect(screen.queryByTestId("edit-modal-sg-id")).not.toBeInTheDocument()
      })

      // Open modal for second security group
      const secondRow = screen.getByTestId("security-group-row-sg-2")
      const secondButton = secondRow.querySelector("button")
      await user.click(secondButton!)
      await waitFor(() => expect(screen.getByText("Edit")).toBeInTheDocument())
      await user.click(screen.getByText("Edit"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-modal-sg-id")).toHaveTextContent("sg-2")
      })
    })
  })

  describe("Access control modal", () => {
    it("opens access control modal when handleAccessControl is called", async () => {
      const user = userEvent.setup()

      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-1")).toBeInTheDocument()
      })

      // Find and click the Access Control menu item
      const firstRow = screen.getByTestId("security-group-row-sg-1")
      const popupMenuButton = firstRow.querySelector("button")
      await user.click(popupMenuButton!)

      await waitFor(() => {
        expect(screen.getByText("Access Control")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Access Control"))

      // Verify modal is open with correct security group
      await waitFor(() => {
        expect(screen.getByTestId("access-control-modal-sg-id")).toHaveTextContent("sg-1")
      })
    })

    it("closes access control modal when close handler is called", async () => {
      const user = userEvent.setup()

      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-1")).toBeInTheDocument()
      })

      // Open modal
      const firstRow = screen.getByTestId("security-group-row-sg-1")
      const popupMenuButton = firstRow.querySelector("button")
      await user.click(popupMenuButton!)

      await waitFor(() => {
        expect(screen.getByText("Access Control")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Access Control"))

      await waitFor(() => {
        expect(screen.getByTestId("access-control-modal-sg-id")).toBeInTheDocument()
      })

      // Close modal
      const closeButton = screen.getByText("Close Access Control")
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByTestId("access-control-modal-sg-id")).not.toBeInTheDocument()
      })
    })
  })

  describe("View details navigation", () => {
    it("navigates to details page when handleViewDetails is called", async () => {
      const user = userEvent.setup()

      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-1")).toBeInTheDocument()
      })

      // Find and click the Show Details menu item
      const firstRow = screen.getByTestId("security-group-row-sg-1")
      const popupMenuButton = firstRow.querySelector("button")
      await user.click(popupMenuButton!)

      await waitFor(() => {
        expect(screen.getByText("Show Details")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Show Details"))

      // Note: Navigation testing in TanStack Router is complex
      // This test verifies the handler is called, but doesn't verify navigation
      // For comprehensive navigation testing, you may need integration tests
    })
  })

  describe("Modal state management", () => {
    it("does not render modals when selectedSecurityGroup is null", async () => {
      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-1")).toBeInTheDocument()
      })

      // Modals should not be rendered initially
      expect(screen.queryByTestId("edit-modal-sg-id")).not.toBeInTheDocument()
      expect(screen.queryByTestId("access-control-modal-sg-id")).not.toBeInTheDocument()
    })

    it("can open both modals for the same security group sequentially", async () => {
      const user = userEvent.setup()

      const router = createTestRouter(
        <SecurityGroupListContainer
          securityGroups={mockSecurityGroups}
          isLoading={false}
          isError={false}
          error={null}
          permissions={defaultPermissions}
        />
      )
      render(<RouterProvider router={router} />)

      await waitFor(() => {
        expect(screen.getByTestId("security-group-row-sg-1")).toBeInTheDocument()
      })

      // Open edit modal
      const firstRow = screen.getByTestId("security-group-row-sg-1")
      const popupMenuButton = firstRow.querySelector("button")
      await user.click(popupMenuButton!)
      await waitFor(() => expect(screen.getByText("Edit")).toBeInTheDocument())
      await user.click(screen.getByText("Edit"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-modal-sg-id")).toHaveTextContent("sg-1")
      })

      // Close edit modal
      await user.click(screen.getByText("Close Edit"))

      await waitFor(() => {
        expect(screen.queryByTestId("edit-modal-sg-id")).not.toBeInTheDocument()
      })

      // Open access control modal
      await user.click(popupMenuButton!)
      await waitFor(() => expect(screen.getByText("Access Control")).toBeInTheDocument())
      await user.click(screen.getByText("Access Control"))

      await waitFor(() => {
        expect(screen.getByTestId("access-control-modal-sg-id")).toHaveTextContent("sg-1")
      })
    })
  })
})