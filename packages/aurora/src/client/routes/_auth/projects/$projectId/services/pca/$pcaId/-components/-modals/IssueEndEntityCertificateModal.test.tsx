import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { IssueEndEntityCertificateModal } from "./IssueEndEntityCertificateModal"

const mockProjectId = "project-123"
const mockNavigate = vi.fn()
const mockMutateAsync = vi.fn().mockResolvedValue({ id: "cert-987" })
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
    useUtils: () => ({
      services: {
        pca: {
          listCertificates: {
            invalidate: mockInvalidate,
          },
        },
      },
    }),
    services: {
      pca: {
        createCertificate: {
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

vi.mock("./ParsedCertificateInfo", () => ({
  ParsedCertificateInfo: ({ csrCode }: { csrCode: string }) => (
    <div data-testid="parsed-certificate-info">{csrCode}</div>
  ),
}))

const renderModal = (onClose = vi.fn()) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <IssueEndEntityCertificateModal open={true} onClose={onClose} pcaId="ca-1" />
      </PortalProvider>
    </I18nProvider>
  )

describe("IssueEndEntityCertificateModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("does not submit when csr is empty", async () => {
    const user = userEvent.setup()

    renderModal()
    expect(screen.getByTestId("parsed-certificate-info")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })

  it("submits normalized csr payload and closes modal", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000)

    renderModal(onClose)

    await user.type(screen.getByPlaceholderText("Paste CSR code"), "line1\\nline2")
    await user.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        project_id: "project-123",
        certificate_authority_id: "ca-1",
        csr: "line1\nline2",
        configuration: {
          validity: {
            not_after: 1_700_028_800,
          },
        },
      })
    })

    expect(mockInvalidate).toHaveBeenCalledTimes(1)
    expect(mockReset).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/services/pca/$pcaId/$certificateId",
      params: { projectId: "project-123", pcaId: "ca-1", certificateId: "cert-987" },
    })
  })
})
