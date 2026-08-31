import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { AddRBACPolicyModal } from "./AddRBACPolicyModal"

const mockProjectId = "project-owner"

type MutationOptions = {
  onSuccess?: (data: unknown, variables: { targetTenant: string }) => void
  onError?: (error: { message: string }) => void
}

const { mockMutate, mockReset, mockInvalidate, mockState } = vi.hoisted(() => ({
  mockMutate: vi.fn(),
  mockReset: vi.fn(),
  mockInvalidate: vi.fn(),
  mockState: { options: {} as MutationOptions },
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => mockProjectId,
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      network: {
        rbacPolicy: { list: { invalidate: mockInvalidate } },
        securityGroup: { getById: { invalidate: mockInvalidate } },
      },
    }),
    network: {
      rbacPolicy: {
        create: {
          useMutation: (options: MutationOptions) => {
            mockState.options = options
            return { mutate: mockMutate, isPending: false, error: null, reset: mockReset }
          },
        },
      },
    },
  },
}))

const renderModal = (isOpen = true, onClose = vi.fn()) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <AddRBACPolicyModal isOpen={isOpen} onClose={onClose} securityGroupId="sg-123" />
      </PortalProvider>
    </I18nProvider>
  )

describe("AddRBACPolicyModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.options = {}
    i18n.activate("en")
  })

  it("renders only when open", () => {
    renderModal(false)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    renderModal()
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Share Security Group")
    expect(screen.getByLabelText("Target Project ID")).toBeInTheDocument()
  })

  it("rejects an invalid project ID without creating a policy", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText("Target Project ID"), "not-a-project-id")
    await user.click(screen.getByRole("button", { name: "Share" }))

    await waitFor(() => {
      expect(screen.getByText(/Invalid project ID format/)).toBeInTheDocument()
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("submits a valid project ID and closes on success", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal(true, onClose)

    await user.type(screen.getByLabelText("Target Project ID"), "12345678123412341234123412345678")
    await user.click(screen.getByRole("button", { name: "Share" }))

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        project_id: mockProjectId,
        securityGroupId: "sg-123",
        targetTenant: "12345678123412341234123412345678",
      })
    })

    mockState.options.onSuccess?.({}, { targetTenant: "12345678123412341234123412345678" })
    expect(mockInvalidate).toHaveBeenCalledTimes(2)
    expect(mockReset).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
