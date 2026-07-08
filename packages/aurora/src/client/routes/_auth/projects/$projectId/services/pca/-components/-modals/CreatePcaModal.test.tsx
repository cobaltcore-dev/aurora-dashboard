import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { CreatePcaModal } from "./CreatePcaModal"

const mockProjectId = "project-123"
const mockNavigate = vi.fn()
const mockMutateAsync = vi.fn().mockResolvedValue({ id: "pca-456" })
const mockReset = vi.fn()
const mockInvalidate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock("@/client/hooks", () => ({
  useProjectId: () => mockProjectId,
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: vi.fn(() => ({
      services: {
        pca: {
          list: {
            invalidate: mockInvalidate,
          },
        },
      },
    })),
    services: {
      pca: {
        create: {
          useMutation: (options?: { onSettled?: () => void }) => ({
            isPending: false,
            mutateAsync: async (input: unknown) => {
              const result = await mockMutateAsync(input)
              options?.onSettled?.()
              return result
            },
            reset: mockReset,
            error: null,
          }),
        },
      },
    },
  },
}))

const renderModal = (onClose = vi.fn()) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <CreatePcaModal open={true} onClose={onClose} />
      </PortalProvider>
    </I18nProvider>
  )

describe("CreatePcaModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  it("submits create payload with project_id and configuration.subject.named_attributes.cn", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderModal(onClose)

    await user.type(screen.getByLabelText("Common name"), "demo-ca.test.sci")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        project_id: "project-123",
        configuration: {
          subject: {
            named_attributes: {
              cn: "demo-ca.test.sci",
            },
          },
        },
      })
    })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mockInvalidate).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/services/pca/$pcaId",
      params: { projectId: "project-123", pcaId: "pca-456" },
    })
  })

  it("disables save button when common name is empty", async () => {
    renderModal()

    const saveButton = screen.getByRole("button", { name: "Save" })
    expect(saveButton).toBeDisabled()
  })

  it("enables save button when common name is filled", async () => {
    const user = userEvent.setup()

    renderModal()

    const commonNameInput = screen.getByLabelText("Common name")
    await user.type(commonNameInput, "demo-ca.test.sci")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled()
    })
  })
})
