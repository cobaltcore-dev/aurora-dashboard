import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, it, expect, afterEach, vi } from "vitest"
import { SecurityGroupRBACPolicies } from "./SecurityGroupRBACPolicies"
import { trpcReact } from "@/client/trpcClient"
import type { RBACPolicy } from "@/server/Network/types/rbacPolicy"

// Simplified mock for tRPC useQuery - only includes properties actually used
type MockQueryResult<TData> = {
  data: TData | undefined
  isPending: boolean
  isError: boolean
  error: { message?: string } | null
  trpc: { path: string }
}

const createMockQueryResult = <TData,>(overrides: Partial<MockQueryResult<TData>> = {}) =>
  ({
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    trpc: { path: "network.rbacPolicy.list" },
    ...overrides,
  }) as ReturnType<typeof trpcReact.network.rbacPolicy.list.useQuery>

// Mock child components
vi.mock("./RBACPolicyRow", () => ({
  RBACPolicyRow: ({ policy, onDelete }: { policy: RBACPolicy; onDelete: () => void }) => (
    <div data-testid={`rbac-policy-row-${policy.id}`}>
      <span>{policy.target_tenant}</span>
      <span>{policy.action}</span>
      <button onClick={onDelete}>Delete</button>
    </div>
  ),
}))

vi.mock("../../-modals/AddRBACPolicyModal", () => ({
  AddRBACPolicyModal: ({
    isOpen,
    onClose,
    securityGroupId,
  }: {
    isOpen: boolean
    onClose: () => void
    securityGroupId: string
  }) => (
    <div data-testid="add-rbac-policy-modal">
      {isOpen && (
        <>
          <span>Add Modal Open</span>
          <span data-testid="modal-security-group-id">{securityGroupId}</span>
          <button onClick={onClose}>Close</button>
        </>
      )}
    </div>
  ),
}))

vi.mock("../../-modals/DeleteRBACPolicyDialog", () => ({
  DeleteRBACPolicyDialog: ({
    policy,
    open,
    onClose,
    onConfirm,
    isLoading,
    error,
  }: {
    policy: RBACPolicy | null
    open: boolean
    onClose: () => void
    onConfirm: (policyId: string) => void
    isLoading: boolean
    error: string | null
  }) => (
    <div data-testid="delete-rbac-policy-dialog">
      {open && policy && (
        <>
          <span>Delete Dialog Open</span>
          <span data-testid="dialog-policy-tenant">{policy.target_tenant}</span>
          <button onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button onClick={() => onConfirm(policy.id)} disabled={isLoading}>
            Confirm
          </button>
          {error && <span data-testid="dialog-error">{error}</span>}
        </>
      )}
    </div>
  ),
}))

// Mock tRPC
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: vi.fn(() => ({
      network: {
        rbacPolicy: {
          list: {
            invalidate: vi.fn(),
          },
        },
        securityGroup: {
          getById: {
            invalidate: vi.fn(),
          },
        },
      },
    })),
    network: {
      rbacPolicy: {
        list: {
          useQuery: vi.fn(),
        },
        delete: {
          useMutation: vi.fn(() => ({
            mutate: vi.fn(),
            isPending: false,
          })),
        },
      },
    },
  },
}))

const mockPolicies: RBACPolicy[] = [
  {
    id: "policy-1",
    object_type: "security_group",
    object_id: "sg-123",
    action: "access_as_shared",
    target_tenant: "project-abc",
    tenant_id: "tenant-123",
    project_id: "project-abc",
  },
  {
    id: "policy-2",
    object_type: "security_group",
    object_id: "sg-123",
    action: "access_as_external",
    target_tenant: "project-xyz",
    tenant_id: "tenant-456",
    project_id: "project-xyz",
  },
  {
    id: "policy-3",
    object_type: "security_group",
    object_id: "sg-123",
    action: "access_as_shared",
    target_tenant: "project-def",
    tenant_id: "tenant-789",
    project_id: "project-def",
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

describe("SecurityGroupRBACPolicies", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders loading state", () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          isPending: true,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByRole("progressbar")).toBeInTheDocument()
    })

    it("renders error state", () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          isError: true,
          error: { message: "Failed to fetch policies" },
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText("Failed to fetch policies")).toBeInTheDocument()
    })

    it("renders empty state when no policies", () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: [],
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText("There are no RBAC policies for this security group")).toBeInTheDocument()
    })

    it("renders policies table with data", () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByTestId("rbac-policy-row-policy-1")).toBeInTheDocument()
      expect(screen.getByTestId("rbac-policy-row-policy-2")).toBeInTheDocument()
      expect(screen.getByTestId("rbac-policy-row-policy-3")).toBeInTheDocument()
      expect(screen.getByText("project-abc")).toBeInTheDocument()
      expect(screen.getByText("project-xyz")).toBeInTheDocument()
    })

    it("renders all table headers", () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText("Target Project ID")).toBeInTheDocument()
      expect(screen.getByText("Action")).toBeInTheDocument()
      expect(screen.getByText("Actions")).toBeInTheDocument()
    })

    it("renders Share Security Group button", () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByRole("button", { name: /Share Security Group/i })).toBeInTheDocument()
    })

    it("displays correct count in toolbar", () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText(/3.*projects/i)).toBeInTheDocument()
    })
  })

  describe("Search functionality", () => {
    it("renders search input", () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument()
    })

    it("filters policies by target tenant", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      const searchInput = screen.getByPlaceholderText("Search...")
      const user = userEvent.setup()
      await user.type(searchInput, "abc")

      await waitFor(() => {
        expect(screen.getByTestId("rbac-policy-row-policy-1")).toBeInTheDocument()
        expect(screen.queryByTestId("rbac-policy-row-policy-2")).not.toBeInTheDocument()
        expect(screen.queryByTestId("rbac-policy-row-policy-3")).not.toBeInTheDocument()
      })
    })

    it("filters policies by action", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      const searchInput = screen.getByPlaceholderText("Search...")
      const user = userEvent.setup()
      await user.type(searchInput, "external")

      await waitFor(() => {
        expect(screen.getByTestId("rbac-policy-row-policy-2")).toBeInTheDocument()
        expect(screen.queryByTestId("rbac-policy-row-policy-1")).not.toBeInTheDocument()
        expect(screen.queryByTestId("rbac-policy-row-policy-3")).not.toBeInTheDocument()
      })
    })

    it("shows empty state message when search matches no policies", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      const searchInput = screen.getByPlaceholderText("Search...")
      const user = userEvent.setup()
      await user.type(searchInput, "nonexistent")

      await waitFor(() => {
        expect(screen.getByText("No policies match your search")).toBeInTheDocument()
      })
    })

    it("search is case insensitive", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      const searchInput = screen.getByPlaceholderText("Search...")
      const user = userEvent.setup()
      await user.type(searchInput, "PROJECT-ABC")

      await waitFor(() => {
        expect(screen.getByTestId("rbac-policy-row-policy-1")).toBeInTheDocument()
      })
    })

    it("updates filtered count in toolbar", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      const searchInput = screen.getByPlaceholderText("Search...")
      const user = userEvent.setup()
      await user.type(searchInput, "abc")

      await waitFor(() => {
        expect(screen.getByText(/1.*of.*3.*projects/i)).toBeInTheDocument()
      })
    })

    it("clears search when input is cleared", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      const searchInput = screen.getByPlaceholderText("Search...")
      const user = userEvent.setup()

      // Type and then clear
      await user.type(searchInput, "abc")
      await user.clear(searchInput)

      await waitFor(() => {
        expect(screen.getByTestId("rbac-policy-row-policy-1")).toBeInTheDocument()
        expect(screen.getByTestId("rbac-policy-row-policy-2")).toBeInTheDocument()
        expect(screen.getByTestId("rbac-policy-row-policy-3")).toBeInTheDocument()
      })
    })
  })

  describe("Add RBAC Policy Modal", () => {
    it("opens modal when Share Security Group button clicked", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      const shareButton = screen.getByRole("button", { name: /Share Security Group/i })
      const user = userEvent.setup()
      await user.click(shareButton)

      await waitFor(() => {
        expect(screen.getByText("Add Modal Open")).toBeInTheDocument()
      })
    })

    it("passes correct securityGroupId to modal", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-456" />, {
        wrapper: createWrapper(),
      })

      const shareButton = screen.getByRole("button", { name: /Share Security Group/i })
      const user = userEvent.setup()
      await user.click(shareButton)

      await waitFor(() => {
        expect(screen.getByTestId("modal-security-group-id")).toHaveTextContent("sg-456")
      })
    })

    it("closes modal when onClose called", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      const shareButton = screen.getByRole("button", { name: /Share Security Group/i })
      const user = userEvent.setup()
      await user.click(shareButton)

      await waitFor(() => {
        expect(screen.getByText("Add Modal Open")).toBeInTheDocument()
      })

      const closeButton = screen.getByRole("button", { name: /Close/i })
      await user.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByText("Add Modal Open")).not.toBeInTheDocument()
      })
    })
  })

  describe("Delete functionality", () => {
    it("opens delete dialog when delete button clicked", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      const deleteButtons = screen.getAllByRole("button", { name: /Delete/i })
      const user = userEvent.setup()
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText("Delete Dialog Open")).toBeInTheDocument()
        expect(screen.getByTestId("dialog-policy-tenant")).toHaveTextContent("project-abc")
      })
    })

    it("closes delete dialog when cancel clicked", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      const deleteButtons = screen.getAllByRole("button", { name: /Delete/i })
      const user = userEvent.setup()
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText("Delete Dialog Open")).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText("Delete Dialog Open")).not.toBeInTheDocument()
      })
    })

    it("calls delete mutation when confirm clicked", async () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: mockPolicies,
        })
      )

      const mockMutate = vi.fn()
      vi.mocked(trpcReact.network.rbacPolicy.delete.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof trpcReact.network.rbacPolicy.delete.useMutation>)

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      const deleteButtons = screen.getAllByRole("button", { name: /Delete/i })
      const user = userEvent.setup()
      await user.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.getByText("Delete Dialog Open")).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole("button", { name: /Confirm/i })
      await user.click(confirmButton)

      expect(mockMutate).toHaveBeenCalledWith({ policyId: "policy-1" })
    })
  })

  describe("Query parameters", () => {
    it("passes correct securityGroupId to query", () => {
      const mockUseQuery = vi.mocked(trpcReact.network.rbacPolicy.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<RBACPolicy[]>({ data: [] }))

      render(<SecurityGroupRBACPolicies securityGroupId="sg-456" />, {
        wrapper: createWrapper(),
      })

      expect(mockUseQuery).toHaveBeenCalledWith(
        { securityGroupId: "sg-456" },
        expect.objectContaining({
          refetchOnWindowFocus: false,
        })
      )
    })

    it("disables refetch on window focus", () => {
      const mockUseQuery = vi.mocked(trpcReact.network.rbacPolicy.list.useQuery)
      mockUseQuery.mockReturnValue(createMockQueryResult<RBACPolicy[]>({ data: [] }))

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          refetchOnWindowFocus: false,
        })
      )
    })
  })

  describe("Edge cases", () => {
    it("handles undefined policies data gracefully", () => {
      vi.mocked(trpcReact.network.rbacPolicy.list.useQuery).mockReturnValue(
        createMockQueryResult<RBACPolicy[]>({
          data: undefined,
        })
      )

      render(<SecurityGroupRBACPolicies securityGroupId="sg-123" />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText("There are no RBAC policies for this security group")).toBeInTheDocument()
    })
  })
})
