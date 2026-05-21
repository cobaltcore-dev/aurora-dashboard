import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { CreateCaModal } from "./CreateCaModal"

const mockProjectId = "project-123"
const mockMutateAsync = vi.fn().mockResolvedValue({})
const mockReset = vi.fn()
const mockInvalidate = vi.fn()

vi.mock("@/client/hooks", () => ({
  useProjectId: () => mockProjectId,
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      services: {
        pca: {
          list: {
            invalidate: mockInvalidate,
          },
        },
      },
    }),
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
        <CreateCaModal open={true} onClose={onClose} />
      </PortalProvider>
    </I18nProvider>
  )

describe("CreateCaModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  it("submits create payload with project_id and configuration.subject.common_name", async () => {
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
            common_name: "demo-ca.test.sci",
          },
        },
      })
    })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mockInvalidate).toHaveBeenCalledTimes(1)
  })

  it("does not submit when common name is empty", async () => {
    const user = userEvent.setup()

    renderModal()
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })
})
