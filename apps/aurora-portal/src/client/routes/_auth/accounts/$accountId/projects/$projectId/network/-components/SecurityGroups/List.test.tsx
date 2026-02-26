/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Juno contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SecurityGroups } from "./List"
import { trpcReact } from "@/client/trpcClient"
import type { SecurityGroup } from "@/server/Network/types/securityGroup"

// Simplified mock for tRPC useQuery - only includes properties actually used
type MockQueryResult<TData> = {
  data: TData | undefined
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  trpc: { path: string }
}

const createMockQueryResult = <TData,>(overrides: Partial<MockQueryResult<TData>> = {}) =>
  ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    trpc: { path: "network.list" },
    ...overrides,
  }) as ReturnType<typeof trpcReact.network.list.useQuery>

// Mock the tRPC client
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    network: {
      list: {
        useQuery: vi.fn(),
      },
    },
  },
}))

// Mock SecurityGroupListContainer
vi.mock("./-components/SecurityGroupListContainer", () => ({
  SecurityGroupListContainer: ({
    securityGroups,
    isLoading,
    isError,
    error,
    permissions,
  }: {
    securityGroups: SecurityGroup[]
    isLoading: boolean
    isError: boolean
    error: { message?: string } | null
    permissions: { canUpdate: boolean; canDelete: boolean; canManageAccess: boolean }
  }) => (
    <div data-testid="security-group-list-container">
      {isLoading && <div>Loading...</div>}
      {isError && <div data-testid="error">{error?.message || "Error"}</div>}
      {!isLoading && !isError && (
        <div data-testid="security-groups-data">
          {securityGroups.length} security groups
          <div data-testid="permissions">{JSON.stringify(permissions)}</div>
        </div>
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
]

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <PortalProvider>{children}</PortalProvider>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe("SecurityGroups", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Component rendering", () => {
    it("renders with SecurityGroupListContainer", () => {
      vi.mocked(trpcReact.network.list.useQuery).mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      expect(screen.getByTestId("security-group-list-container")).toBeInTheDocument()
    })

    it("passes correct default permissions", () => {
      vi.mocked(trpcReact.network.list.useQuery).mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      const permissionsElement = screen.getByTestId("permissions")
      expect(permissionsElement.textContent).toBe(
        JSON.stringify({
          canUpdate: true,
          canDelete: false,
          canManageAccess: true,
        })
      )
    })
  })

  describe("tRPC query", () => {
    it("calls tRPC with default sort parameters", () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<SecurityGroup[]>({ data: [] }))

      render(<SecurityGroups />, { wrapper: createWrapper() })

      expect(mockUseQuery).toHaveBeenCalledWith({
        sort_key: "name",
        sort_dir: "asc",
      })
    })

    it("passes loading state", () => {
      vi.mocked(trpcReact.network.list.useQuery).mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          isLoading: true,
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })

    it("passes error state", () => {
      vi.mocked(trpcReact.network.list.useQuery).mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          isError: true,
          error: { message: "Failed to fetch" },
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      expect(screen.getByTestId("error")).toHaveTextContent("Failed to fetch")
    })

    it("passes security groups data", () => {
      vi.mocked(trpcReact.network.list.useQuery).mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      expect(screen.getByTestId("security-groups-data")).toHaveTextContent("2 security groups")
    })
  })

  describe("Sort functionality", () => {
    it("updates sort when field changes", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<SecurityGroup[]>({ data: mockSecurityGroups }))

      const user = userEvent.setup()
      render(<SecurityGroups />, { wrapper: createWrapper() })

      const sortSelect = screen.getByTestId("sort-select")
      await user.click(sortSelect)
      await user.click(screen.getByText("Project id"))

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({
          sort_key: "project_id",
          sort_dir: "asc",
        })
      })
    })

    it("toggles sort direction", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<SecurityGroup[]>({ data: mockSecurityGroups }))

      const user = userEvent.setup()
      render(<SecurityGroups />, { wrapper: createWrapper() })

      const directionToggle = screen.getByTestId("direction-toggle")
      await user.click(directionToggle)

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({
          sort_key: "name",
          sort_dir: "desc",
        })
      })
    })
  })

  describe("Filter functionality", () => {
    it("applies boolean filter to query", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<SecurityGroup[]>({ data: mockSecurityGroups }))

      const user = userEvent.setup()
      render(<SecurityGroups />, { wrapper: createWrapper() })

      const filterSelect = screen.getByTestId("select-filterValue")
      await user.click(filterSelect)
      await user.click(screen.getByTestId("shared"))

      const combobox = screen.getByTestId("combobox-filterValue")
      await user.click(combobox.querySelector(".juno-combobox-toggle")!)
      await user.click(screen.getByTestId("true"))

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({ shared: true })
      })
    })

    it("converts string 'false' to boolean", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<SecurityGroup[]>({ data: mockSecurityGroups }))

      const user = userEvent.setup()
      render(<SecurityGroups />, { wrapper: createWrapper() })

      const filterSelect = screen.getByTestId("select-filterValue")
      await user.click(filterSelect)
      await user.click(screen.getByTestId("shared"))

      const combobox = screen.getByTestId("combobox-filterValue")
      await user.click(combobox.querySelector(".juno-combobox-toggle")!)
      await user.click(screen.getByTestId("false"))

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({ shared: false })
      })
    })
  })

  describe("Search functionality", () => {
    it("includes search term in query", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<SecurityGroup[]>({ data: mockSecurityGroups }))

      const user = userEvent.setup()
      render(<SecurityGroups />, { wrapper: createWrapper() })

      const searchbox = screen.getByRole("searchbox")
      await user.type(searchbox, "web")

      const searchButton = screen.getByRole("button", { name: "Search" })
      await user.click(searchButton)

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({ searchTerm: "web" })
      })
    })

    it("excludes empty search term", () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<SecurityGroup[]>({ data: mockSecurityGroups }))

      render(<SecurityGroups />, { wrapper: createWrapper() })

      const initialCall = mockUseQuery.mock.calls[0][0] as Record<string, unknown>
      expect("searchTerm" in initialCall).toBe(false)
    })
  })

  describe("Integration", () => {
    it("combines sort, filter, and search parameters", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<SecurityGroup[]>({ data: mockSecurityGroups }))

      const user = userEvent.setup()
      render(<SecurityGroups />, { wrapper: createWrapper() })

      // Change sort
      const sortSelect = screen.getByTestId("sort-select")
      await user.click(sortSelect)
      await user.click(screen.getByText("Project id"))

      // Apply filter
      const filterSelect = screen.getByTestId("select-filterValue")
      await user.click(filterSelect)
      await user.click(screen.getByTestId("shared"))

      const combobox = screen.getByTestId("combobox-filterValue")
      await user.click(combobox.querySelector(".juno-combobox-toggle")!)
      await user.click(screen.getByTestId("true"))

      // Search
      const searchbox = screen.getByRole("searchbox")
      await user.type(searchbox, "web")
      const searchButton = screen.getByRole("button", { name: "Search" })
      await user.click(searchButton)

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({
          sort_key: "project_id",
          sort_dir: "asc",
          shared: true,
          searchTerm: "web",
        })
      })
    })
  })
})
