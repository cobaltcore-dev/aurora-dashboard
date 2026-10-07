import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
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
  mockState: {
    options: {} as MutationOptions,
    isPending: false,
    error: null as { message: string } | null,
  },
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
            return { mutate: mockMutate, isPending: mockState.isPending, error: mockState.error, reset: mockReset }
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
    mockState.isPending = false
    mockState.error = null
    i18n.activate("en")
  })

  it("renders only when open", () => {
    renderModal(false)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    renderModal()
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Share Security Group")
    expect(screen.getByLabelText("Target Project ID")).toBeInTheDocument()
  })

  it("explains the project ID format in the help text", () => {
    renderModal()
    expect(
      screen.getByText(
        "ID of the project to share with: 32 hexadecimal characters, dashes optional. It is shown as Project ID at the top of that project's pages."
      )
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Target Project ID")).toHaveAttribute("placeholder", "")
  })

  it("keeps Share Group disabled until the project ID is valid", async () => {
    const user = userEvent.setup()
    renderModal()
    const shareButton = screen.getByRole("button", { name: "Share Group" })

    expect(shareButton).toBeDisabled()
    await user.type(screen.getByLabelText("Target Project ID"), "not-a-project-id")
    expect(shareButton).toBeDisabled()

    await user.clear(screen.getByLabelText("Target Project ID"))
    await user.type(screen.getByLabelText("Target Project ID"), "12345678-1234-1234-1234-123456789abc")
    expect(shareButton).toBeEnabled()
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("shows the format error on blur and hides it while typing", async () => {
    const user = userEvent.setup()
    renderModal()
    const input = screen.getByLabelText("Target Project ID")

    await user.type(input, "not-a-project-id")
    fireEvent.blur(input)
    expect(
      screen.getByText("Enter a valid project ID: 32 hexadecimal characters, dashes optional.")
    ).toBeInTheDocument()

    await user.type(input, "x")
    expect(screen.queryByText(/Enter a valid project ID/)).not.toBeInTheDocument()
  })

  it("shows the required error when the field is left empty", () => {
    renderModal()
    fireEvent.blur(screen.getByLabelText("Target Project ID"))
    expect(screen.getByText("Target project ID is required")).toBeInTheDocument()
  })

  it("shows a progress status instead of the form while sharing", () => {
    mockState.isPending = true
    renderModal()

    expect(screen.getByText("Sharing Security Group...")).toBeInTheDocument()
    expect(screen.queryByLabelText("Target Project ID")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
  })

  it("explains a conflict error from the server", () => {
    mockState.error = { message: "409 Conflict" }
    renderModal()
    expect(screen.getByText("This security group is already shared with the specified project.")).toBeInTheDocument()
  })

  it("submits a valid project ID and closes on success", async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderModal(true, onClose)

    await user.type(screen.getByLabelText("Target Project ID"), "12345678123412341234123412345678")
    await user.click(screen.getByRole("button", { name: "Share Group" }))

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
