import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { toast } from "@cloudoperators/juno-ui-components"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { SecurityGroups } from "./SecurityGroupsList"

const { mockDelete, mockUpdate, mockInvalidate } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockUpdate: vi.fn(),
  mockInvalidate: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}))

vi.mock("../-hooks/useSecurityGroupPermissions", () => ({
  useSecurityGroupPermissions: () => ({
    permissions: {
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canCreateRule: true,
      canDeleteRule: true,
      canManageAccess: false,
      canViewRBAC: false,
    },
  }),
}))

vi.mock("./SecurityGroupListContainer", () => ({
  SecurityGroupListContainer: ({
    onDeleteSecurityGroup,
    onUpdateSecurityGroup,
  }: {
    onDeleteSecurityGroup?: (id: string) => void
    onUpdateSecurityGroup?: (id: string, data: { name: string }) => Promise<void>
  }) => (
    <div>
      <button onClick={() => onDeleteSecurityGroup?.("sg-123")}>Delete group</button>
      <button onClick={() => onUpdateSecurityGroup?.("sg-123", { name: "updated" })}>Update group</button>
    </div>
  ),
}))

vi.mock("./-modals/CreateSecurityGroupModal", () => ({
  CreateSecurityGroupModal: () => null,
}))

vi.mock("./SecurityGroupToastNotifications", () => ({
  getSecurityGroupDeletedToast: (name: string) => ({ message: "deleted", description: name }),
  getSecurityGroupDeleteErrorToast: (errorMessage: string) => ({ message: "delete error", description: errorMessage }),
  getSecurityGroupUpdatedToast: (name: string) => ({ message: "updated", description: name }),
  getSecurityGroupUpdateErrorToast: (errorMessage: string) => ({ message: "update error", description: errorMessage }),
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "project-owner",
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      network: {
        securityGroup: {
          list: { invalidate: mockInvalidate },
          getById: { invalidate: mockInvalidate },
        },
      },
    }),
    network: {
      securityGroup: {
        list: {
          useQuery: () => ({
            data: [{ id: "sg-123", name: "web-sg" }],
            isLoading: false,
            isError: false,
            error: null,
          }),
        },
        create: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
        deleteById: {
          useMutation: (options: Record<string, unknown>) => ({
            mutate: (variables: unknown, callbacks: { onSuccess?: () => void }) => {
              mockDelete(variables, callbacks)
            },
            isPending: false,
            ...options,
          }),
        },
        update: {
          useMutation: (options: Record<string, unknown>) => ({
            mutateAsync: (variables: unknown) => {
              mockUpdate(variables)
              return Promise.resolve()
            },
            isPending: false,
            ...options,
          }),
        },
      },
    },
  },
}))

const renderList = () =>
  render(
    <I18nProvider i18n={i18n}>
      <SecurityGroups project="project-owner" />
    </I18nProvider>
  )

describe("SecurityGroups", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  it("shows a success toast with the group name after deletion", async () => {
    const success = vi.spyOn(toast, "success")
    const user = userEvent.setup()
    renderList()

    await user.click(screen.getByRole("button", { name: "Delete group" }))
    const callbacks = mockDelete.mock.calls[0][1] as { onSuccess: () => void }
    callbacks.onSuccess()

    expect(mockDelete).toHaveBeenCalledWith(
      { project_id: "project-owner", securityGroupId: "sg-123" },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
    expect(success).toHaveBeenCalledWith(expect.anything(), expect.anything())
  })

  it("uses the submitted name in the update success toast", async () => {
    const success = vi.spyOn(toast, "success")
    const user = userEvent.setup()
    renderList()

    await user.click(screen.getByRole("button", { name: "Update group" }))

    expect(mockUpdate).toHaveBeenCalledWith({
      project_id: "project-owner",
      securityGroupId: "sg-123",
      name: "updated",
    })
    expect(success).toHaveBeenCalledWith("updated", { description: "updated" })
  })
})
