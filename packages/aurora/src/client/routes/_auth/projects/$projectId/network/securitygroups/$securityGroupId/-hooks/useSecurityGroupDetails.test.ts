import { act, renderHook } from "@testing-library/react"
import { toast } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { useSecurityGroupDetails } from "./useSecurityGroupDetails"

const mockProjectId = "project-owner"

const { mockMutations, mockInvalidate } = vi.hoisted(() => ({
  mockMutations: {
    update: { mutateAsync: vi.fn(), options: {} as Record<string, unknown> },
    deleteRule: { mutateAsync: vi.fn(), options: {} as Record<string, unknown> },
    createRule: { mutateAsync: vi.fn(), options: {} as Record<string, unknown> },
  },
  mockInvalidate: vi.fn(),
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => mockProjectId,
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      network: {
        securityGroup: {
          getById: { getData: vi.fn(), invalidate: mockInvalidate },
          list: { invalidate: mockInvalidate },
        },
      },
    }),
    network: {
      securityGroup: {
        getById: {
          useQuery: vi.fn(() => ({
            data: { name: "web-sg", security_group_rules: [] },
            isPending: false,
            isError: false,
            error: null,
          })),
        },
        update: {
          useMutation: (options: Record<string, unknown>) => {
            mockMutations.update.options = options
            return { ...mockMutations.update, isPending: false, error: null }
          },
        },
      },
      securityGroupRule: {
        delete: {
          useMutation: (options: Record<string, unknown>) => {
            mockMutations.deleteRule.options = options
            return { ...mockMutations.deleteRule, isPending: false, error: null }
          },
        },
        create: {
          useMutation: (options: Record<string, unknown>) => {
            mockMutations.createRule.options = options
            return { ...mockMutations.createRule, isPending: false, error: null }
          },
        },
      },
    },
  },
}))

vi.mock("../../-components/SecurityGroupToastNotifications", () => ({
  getSecurityGroupUpdatedToast: (name: string) => ({ message: "updated", description: name }),
  getSecurityGroupUpdateErrorToast: (errorMessage: string) => ({ message: "update error", description: errorMessage }),
  getSecurityGroupRuleCreatedToast: () => ({ message: "created", description: "rule created" }),
  getSecurityGroupRuleCreateErrorToast: (errorMessage: string) => ({
    message: "create error",
    description: errorMessage,
  }),
  getSecurityGroupRuleDeletedToast: () => ({ message: "deleted", description: "rule deleted" }),
  getSecurityGroupRuleDeleteErrorToast: (errorMessage: string) => ({
    message: "delete error",
    description: errorMessage,
  }),
}))

const filterControls = {
  searchTerm: "",
  onSearchChange: vi.fn(),
  sortSettings: { sortBy: "", sortDirection: "asc", options: [] },
  onSortChange: vi.fn(),
  filterSettings: { selectedFilters: [], filters: [] },
  onFilterChange: vi.fn(),
} as never

describe("useSecurityGroupDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.values(mockMutations).forEach((mutation) => {
      mutation.options = {}
    })
  })

  it("passes project and resource data to mutation handlers", async () => {
    const { result } = renderHook(() => useSecurityGroupDetails({ securityGroupId: "sg-123", filterControls }))

    await act(async () => {
      await result.current.handleUpdate("sg-456", { name: "updated-name" })
      await result.current.handleDeleteRule("rule-123")
      await result.current.handleCreateRule({
        security_group_id: "sg-123",
        direction: "ingress",
        ethertype: "IPv4",
        remote_ip_prefix: null,
        remote_group_id: null,
        remote_address_group_id: null,
      })
    })

    expect(mockMutations.update.mutateAsync).toHaveBeenCalledWith({
      project_id: mockProjectId,
      securityGroupId: "sg-456",
      name: "updated-name",
    })
    expect(mockMutations.deleteRule.mutateAsync).toHaveBeenCalledWith({
      project_id: mockProjectId,
      ruleId: "rule-123",
    })
    expect(mockMutations.createRule.mutateAsync).toHaveBeenCalledWith({
      project_id: mockProjectId,
      security_group_id: "sg-123",
      direction: "ingress",
      ethertype: "IPv4",
      remote_ip_prefix: null,
      remote_group_id: null,
      remote_address_group_id: null,
    })
  })

  it("registers success callbacks that show operation toasts", () => {
    renderHook(() => useSecurityGroupDetails({ securityGroupId: "sg-123", filterControls }))
    const success = vi.spyOn(toast, "success")

    ;(mockMutations.update.options.onSuccess as (data: unknown, variables: { name?: string }) => void)(
      {},
      { name: "renamed-sg" }
    )
    ;(mockMutations.deleteRule.options.onSuccess as () => void)()
    ;(mockMutations.createRule.options.onSuccess as () => void)()

    expect(success).toHaveBeenCalledTimes(3)
    expect(success).toHaveBeenCalledWith("updated", { description: "renamed-sg" })
    expect(mockInvalidate).toHaveBeenCalled()
  })
})
