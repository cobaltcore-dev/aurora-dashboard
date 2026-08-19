import { describe, it, expect, vi, beforeEach } from "vitest"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider, toast } from "@cloudoperators/juno-ui-components"
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

vi.mock("./ParsedCertificateInfo", () => ({
  ParsedCertificateInfo: ({ csrCode }: { csrCode: string }) => (
    <div data-testid="parsed-certificate-info">{csrCode}</div>
  ),
}))

vi.mock("./parseCsrInfo", () => ({
  isValidCertificateChain: vi.fn(() => true),
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
    expect(screen.getByTestId("parsed-certificate-info")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
    expect(document.querySelector('input[type="file"]')).toHaveAttribute("accept", ".json")
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
    const toastSuccess = vi.spyOn(toast, "success")

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

    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mockInvalidate).toHaveBeenCalledTimes(1)
    expect(mockInvalidate).toHaveBeenCalledWith({
      project_id: mockProjectId,
      certificate_authority_id: mockPcaId,
    })
  })

  it("ignores non-JSON file uploads", async () => {
    const user = userEvent.setup()
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["certificate content"], "certificate.pem", { type: "text/plain" })

    await user.upload(fileInput, file)

    expect(screen.getByPlaceholderText("Paste the code")).toHaveValue("")
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

  it("clears file input after successful upload so the same file can be re-uploaded", async () => {
    const user = userEvent.setup()
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const jsonContent = JSON.stringify({
      imported_certificate_chain: "-----BEGIN CERTIFICATE-----\nFROM_JSON\n-----END CERTIFICATE-----",
    })
    const file = new File([jsonContent], "certificate.json", { type: "application/json" })

    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(fileInput.value).toBe("")
    })
  })

  it("shows an error for malformed JSON", async () => {
    const user = userEvent.setup()
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const malformedJson = "{invalid json"

    const file = new File([malformedJson], "certificate.json", { type: "application/json" })

    await user.upload(fileInput, file)

    await waitFor(() => expect(screen.getByText(/JSON/i)).toBeInTheDocument())
    expect(screen.getByPlaceholderText("Paste the code")).toHaveValue("")
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })

  it("shows an error when JSON has no certificate chain string", async () => {
    const user = userEvent.setup()
    renderModal()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const jsonContent = JSON.stringify({ imported_certificate_chain: 123 })

    const file = new File([jsonContent], "certificate.json", { type: "application/json" })

    await user.upload(fileInput, file)

    await waitFor(() =>
      expect(screen.getByText("The JSON file must contain imported_certificate_chain.")).toBeInTheDocument()
    )
    expect(screen.getByPlaceholderText("Paste the code")).toHaveValue("")
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
  })
})
