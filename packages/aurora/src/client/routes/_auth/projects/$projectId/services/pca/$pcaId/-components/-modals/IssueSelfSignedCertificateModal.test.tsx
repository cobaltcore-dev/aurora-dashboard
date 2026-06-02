import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { CertificateAuthority } from "@/server/Services/types/pca"
import { IssueSelfSignedCertificateModal } from "./IssueSelfSignedCertificateModal"

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

const createPca = (csr?: string): CertificateAuthority => ({
  id: "ca-1",
  project_id: "project-123",
  state: "AWAITING_CERTIFICATE",
  csr,
})

const renderModal = (pca: CertificateAuthority, onClose = vi.fn()) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <IssueSelfSignedCertificateModal open={true} onClose={onClose} pca={pca} />
      </PortalProvider>
    </I18nProvider>
  )

describe("IssueSelfSignedCertificateModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("does not submit when pca csr is missing", async () => {
    const user = userEvent.setup()

    renderModal(createPca())
    await user.click(screen.getByRole("button", { name: "Issue Certificate" }))

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })

  it("submits self-signed certificate payload and closes modal", async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000)

    renderModal(createPca("-----BEGIN CERTIFICATE REQUEST-----\nabc\n-----END CERTIFICATE REQUEST-----"), onClose)
    await user.click(screen.getByRole("button", { name: "Issue Certificate" }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        project_id: "project-123",
        certificate_authority_id: "ca-1",
        csr: "-----BEGIN CERTIFICATE REQUEST-----\nabc\n-----END CERTIFICATE REQUEST-----",
        configuration: {
          validity: {
            not_after: 1_700_086_400,
          },
        },
      })
    })

    expect(mockInvalidate).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
