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

  const securityGroupsRoute = createRoute({
    getParentRoute: () => networkRoute,
    path: "security-groups",
  })

  const securityGroupDetailsRoute = createRoute({
    getParentRoute: () => securityGroupsRoute,
    path: "$securityGroupId",
    component: () => <div>Security Group Details</div>,
  })

  const routeTree = rootRoute.addChildren([
    accountsRoute.addChildren([
      projectsRoute.addChildren([
        networkRoute.addChildren([securityGroupsRoute.addChildren([securityGroupDetailsRoute])]),
      ]),
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

  describe("State rendering", () => {
    it("renders loading spinner", async () => {
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

      expect(screen.getByRole("progressbar")).toBeInTheDocument()
    })

    it("renders error message", async () => {
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

    it("renders default error message when error is null", async () => {
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

    it("renders empty state", async () => {
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
    })
  })

  describe("Data rendering", () => {
    it("renders security groups", async () => {
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

    it("renders column headers", async () => {
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
  })

  describe("Edit modal", () => {
    it("opens edit modal", async () => {
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

      const firstRow = screen.getByTestId("security-group-row-sg-1")
      const popupMenuButton = firstRow.querySelector("button")
      await user.click(popupMenuButton!)

      await waitFor(() => {
        expect(screen.getByText("Edit")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Edit"))

      await waitFor(() => {
        expect(screen.getByTestId("edit-modal-sg-id")).toHaveTextContent("sg-1")
      })
    })

    it("closes edit modal", async () => {
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

      const closeButton = screen.getByText("Close Edit")
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByTestId("edit-modal-sg-id")).not.toBeInTheDocument()
      })
    })
  })

  describe("Access control modal", () => {
    it("opens access control modal", async () => {
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

      const firstRow = screen.getByTestId("security-group-row-sg-1")
      const popupMenuButton = firstRow.querySelector("button")
      await user.click(popupMenuButton!)

      await waitFor(() => {
        expect(screen.getByText("Access Control")).toBeInTheDocument()
      })

      await user.click(screen.getByText("Access Control"))

      await waitFor(() => {
        expect(screen.getByTestId("access-control-modal-sg-id")).toHaveTextContent("sg-1")
      })
    })

    it("closes access control modal", async () => {
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

      const closeButton = screen.getByText("Close Access Control")
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByTestId("access-control-modal-sg-id")).not.toBeInTheDocument()
      })
    })
  })
})
