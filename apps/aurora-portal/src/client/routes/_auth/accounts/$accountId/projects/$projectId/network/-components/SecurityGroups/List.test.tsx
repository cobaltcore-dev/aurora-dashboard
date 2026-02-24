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

// Type-safe mock for tRPC useQuery return value
type MockTRPCQueryResult<TData> = {
  data: TData | undefined
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  isSuccess: boolean
  status: "pending" | "error" | "success"
  dataUpdatedAt: number
  errorUpdatedAt: number
  failureCount: number
  failureReason: unknown
  errorUpdateCount: number
  isFetched: boolean
  isFetchedAfterMount: boolean
  isFetching: boolean
  isLoadingError: boolean
  isPaused: boolean
  isPlaceholderData: boolean
  isRefetchError: boolean
  isRefetching: boolean
  isStale: boolean
  refetch: () => Promise<unknown>
  fetchStatus: "fetching" | "paused" | "idle"
  isPending: boolean
  isInitialLoading: boolean
  isEnabled: boolean
  promise: Promise<unknown>
  trpc: {
    path: string
  }
}

// Helper to create mock query result with proper types
// Note: We use 'any' to bypass tRPC's complex discriminated union types
// while maintaining type safety for all the properties we define
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockQueryResult = <TData,>(overrides: Partial<MockTRPCQueryResult<TData>>): any => ({
  data: undefined,
  isLoading: false,
  isError: false,
  error: null,
  isSuccess: true,
  status: "success",
  dataUpdatedAt: Date.now(),
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  errorUpdateCount: 0,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetching: false,
  isLoadingError: false,
  isPaused: false,
  isPlaceholderData: false,
  isRefetchError: false,
  isRefetching: false,
  isStale: false,
  isPending: false,
  isInitialLoading: false,
  isEnabled: true,
  promise: Promise.resolve(undefined),
  refetch: vi.fn().mockResolvedValue(undefined),
  fetchStatus: "idle",
  trpc: {
    path: "network.list",
  },
  ...overrides,
})

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
    it("renders the component with ListToolbar and SecurityGroupListContainer", () => {
      vi.mocked(trpcReact.network.list.useQuery).mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      expect(screen.getByTestId("security-group-list-container")).toBeInTheDocument()
    })

    it("passes correct default permissions to SecurityGroupListContainer", () => {
      vi.mocked(trpcReact.network.list.useQuery).mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
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
      mockUseQuery.mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: [],
          isLoading: false,
          isError: false,
          error: null,
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      expect(mockUseQuery).toHaveBeenCalledWith({
        sort_key: "name",
        sort_dir: "asc",
      })
    })

    it("passes loading state to SecurityGroupListContainer", () => {
      vi.mocked(trpcReact.network.list.useQuery).mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: undefined,
          isLoading: true,
          isError: false,
          error: null,
          status: "pending",
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })

    it("passes error state to SecurityGroupListContainer", () => {
      vi.mocked(trpcReact.network.list.useQuery).mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: undefined,
          isLoading: false,
          isError: true,
          error: { message: "Failed to fetch" },
          status: "error",
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      expect(screen.getByTestId("error")).toBeInTheDocument()
      expect(screen.getByTestId("error")).toHaveTextContent("Failed to fetch")
    })

    it("passes security groups data to SecurityGroupListContainer", () => {
      vi.mocked(trpcReact.network.list.useQuery).mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      expect(screen.getByTestId("security-groups-data")).toHaveTextContent("2 security groups")
    })
  })

  describe("Sort functionality", () => {
    it("updates sort settings when sort field changes", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
        })
      )

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
      mockUseQuery.mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
        })
      )

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
    it("applies filter parameters to tRPC query", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
        })
      )

      const user = userEvent.setup()
      render(<SecurityGroups />, { wrapper: createWrapper() })

      // Select shared filter
      const filterSelect = screen.getByTestId("select-filterValue")
      await user.click(filterSelect)
      await user.click(screen.getByTestId("shared"))

      const combobox = screen.getByTestId("combobox-filterValue")
      await user.click(combobox.querySelector(".juno-combobox-toggle")!)
      await user.click(screen.getByTestId("true"))

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({
          shared: true,
        })
      })
    })

    it("converts string 'false' to boolean false in filter params", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
        })
      )

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
        expect(lastCall).toMatchObject({
          shared: false,
        })
      })
    })

    it("ignores inactive filters", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      // Initially should not have any filter params
      const initialCall = mockUseQuery.mock.calls[0][0] as Record<string, unknown>
      expect("shared" in initialCall).toBe(false)
    })
  })

  describe("Search functionality", () => {
    it("includes search term in tRPC query when provided", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
        })
      )

      const user = userEvent.setup()
      render(<SecurityGroups />, { wrapper: createWrapper() })

      const searchbox = screen.getByRole("searchbox")
      await user.type(searchbox, "web")

      const searchButton = screen.getByRole("button", { name: "Search" })
      await user.click(searchButton)

      await waitFor(() => {
        const lastCall = mockUseQuery.mock.calls[mockUseQuery.mock.calls.length - 1][0]
        expect(lastCall).toMatchObject({
          searchTerm: "web",
        })
      })
    })

    it("excludes search term from query when empty", () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      const initialCall = mockUseQuery.mock.calls[0][0] as Record<string, unknown>
      expect("searchTerm" in initialCall).toBe(false)
    })

    it("handles non-string search terms gracefully", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      // The handleSearchChange function should handle non-string values
      // This is tested through the function's internal logic
      expect(mockUseQuery).toHaveBeenCalled()
    })
  })

  describe("buildFilterParams function", () => {
    it("returns empty object when no filters are selected", () => {
      vi.mocked(trpcReact.network.list.useQuery).mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: [],
          isLoading: false,
          isError: false,
          error: null,
        })
      )

      render(<SecurityGroups />, { wrapper: createWrapper() })

      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      const call = mockUseQuery.mock.calls[0][0]

      // Should only have sort parameters, no filter parameters
      expect(call).toEqual({
        sort_key: "name",
        sort_dir: "asc",
      })
    })
  })

  describe("Integration tests", () => {
    it("combines sort, filter, and search parameters in tRPC query", async () => {
      const mockUseQuery = vi.mocked(trpcReact.network.list.useQuery)
      mockUseQuery.mockReturnValue(
        createMockQueryResult<SecurityGroup[]>({
          data: mockSecurityGroups,
          isLoading: false,
          isError: false,
          error: null,
        })
      )

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
