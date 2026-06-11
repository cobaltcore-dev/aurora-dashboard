import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { ImportExternallySignedCertificateModal } from "./ImportExternallySignedCertificateModal"

const mockProjectId = "project-123"
const mockPcaId = "ca-1"
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
          getById: {
            invalidate: mockInvalidate,
          },
        },
      },
    }),
    services: {
      pca: {
        import: {
          useMutation: (options?: { onSettled?: () => void }) => ({
            isPending: false,
            mutateAsync: async (input: unknown) => {
              const result = await mockMutateAsync(input)
              options?.onSettled?.()
              return result
            },
            error: null,
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
        <ImportExternallySignedCertificateModal open={true} onClose={onClose} pcaId={mockPcaId} />
      </PortalProvider>
    </I18nProvider>
  )

describe("ImportExternallySignedCertificateModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  it("renders modal with form elements", () => {
    renderModal()

    expect(screen.getByText("Import Externally Signed Certificate")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Choose Certificate to Import" })).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Paste the code")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
  })

  it("disables save button when certificate chain is empty", () => {
    renderModal()

    const saveButton = screen.getByRole("button", { name: "Save" })
    expect(saveButton).toBeDisabled()
  })

  it("enables save button when certificate chain is filled", async () => {
    const user = userEvent.setup()
    renderModal()

    const textarea = screen.getByPlaceholderText("Paste the code")
    await user.type(textarea, "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----")

    const saveButton = screen.getByRole("button", { name: "Save" })
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled()
    })
  })

  it("submits import with correct payload", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    renderModal(onClose)

    const textarea = screen.getByPlaceholderText("Paste the code")
    const certificateChain = "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----"
    await user.type(textarea, certificateChain)

    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        project_id: mockProjectId,
        certificate_authority_id: mockPcaId,
        imported_certificate_chain: certificateChain,
      })
    })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mockInvalidate).toHaveBeenCalledTimes(1)
  })

  it("handles file upload with text file", async () => {
    const user = userEvent.setup()
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const certificateContent = "-----BEGIN CERTIFICATE-----\nFROM_FILE\n-----END CERTIFICATE-----"

    const file = new File([certificateContent], "certificate.pem", { type: "text/plain" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Paste the code")).toHaveValue(certificateContent)
    })
  })

  it("handles file upload with valid JSON file", async () => {
    const user = userEvent.setup()
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const certificateContent = "-----BEGIN CERTIFICATE-----\nFROM_JSON\n-----END CERTIFICATE-----"
    const jsonContent = JSON.stringify({ imported_certificate_chain: certificateContent })

    const file = new File([jsonContent], "certificate.json", { type: "application/json" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Paste the code")).toHaveValue(certificateContent)
    })
  })

  it("falls back to raw text on malformed JSON", async () => {
    const user = userEvent.setup()
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const malformedJson = "{invalid json"

    const file = new File([malformedJson], "certificate.json", { type: "application/json" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Paste the code")).toHaveValue(malformedJson)
    })
  })

  it("falls back to raw text when JSON has non-string imported_certificate_chain", async () => {
    const user = userEvent.setup()
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const jsonContent = JSON.stringify({ imported_certificate_chain: 123 })

    const file = new File([jsonContent], "certificate.json", { type: "application/json" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Paste the code")).toHaveValue(jsonContent)
    })
  })
})
