import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { Certificate } from "@/server/Services/types/pca"
import { trpcReact } from "@/client/trpcClient"
import { PcaCertificatesListContainer } from "./PcaCertificatesListContainer"

vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcReact: {
      ...actual.trpcReact,
      services: {
        ...actual.trpcReact.services,
        pca: {
          ...actual.trpcReact.services.pca,
          listCertificates: {
            ...actual.trpcReact.services.pca.listCertificates,
            useQuery: vi.fn(),
          },
        },
      },
    },
  }
})

vi.mock("@/client/hooks", () => ({
  useProjectId: () => "project-1",
}))

vi.mock("./-table/PcaCertificatesTableRow", () => ({
  PcaCertificatesTableRow: ({ certificate }: { certificate: Certificate }) => (
    <tr data-testid={`certificate-row-${certificate.id}`}>
      <td>{certificate.certificate_authority_id}</td>
      <td>{certificate.id}</td>
    </tr>
  ),
}))

vi.mock("./-modals/IssueEndEntityCertificateModal", () => ({
  IssueEndEntityCertificateModal: ({ open }: { open: boolean }) => (open ? <div>Issue End-Entity Modal</div> : null),
}))

describe("PcaCertificatesListContainer", () => {
  const validCertificate: Certificate = {
    id: "cert-1",
    certificate_authority_id: "ca-1",
    project_id: "project-1",
  }

  const validCertificate2: Certificate = {
    id: "cert-2",
    certificate_authority_id: "ca-1",
    project_id: "project-1",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = (pcaState: "READY" | "AWAITING_CERTIFICATE" = "READY") =>
    render(
      <I18nProvider i18n={i18n}>
        <PcaCertificatesListContainer pcaId="ca-1" pcaState={pcaState} />
      </I18nProvider>
    )

  it("calls listCertificates query with correct parameters", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderComponent()

    expect(vi.mocked(trpcReact.services.pca.listCertificates.useQuery)).toHaveBeenCalledWith({
      project_id: "project-1",
      certificate_authority_id: "ca-1",
    })
  })

  it("renders loading state", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      error: null,
    } as never)

    renderComponent()

    expect(screen.getByText("Loading Certificates issued by Certificate Authority...")).toBeInTheDocument()
  })

  it("renders error state with error message", () => {
    const errorMessage = "Failed to fetch certificates"
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: { message: errorMessage },
    } as never)

    renderComponent()

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it("renders default error message when no error details provided", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: null,
    } as never)

    renderComponent()

    expect(screen.getByText("Failed to load Certificates issued by Certificate Authority.")).toBeInTheDocument()
  })

  it("renders empty state when no certificates exist", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderComponent()

    expect(screen.getByText("No Certificates issued by this Certificate Authority found")).toBeInTheDocument()
    expect(screen.getByText("There are no Certificates available for this Certificate Authority.")).toBeInTheDocument()
    expect(screen.getByTestId("no-pcas-certificates")).toBeInTheDocument()
  })

  it("renders data grid with certificates", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [validCertificate, validCertificate2],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderComponent()

    expect(screen.getByTestId("certificate-row-cert-1")).toBeInTheDocument()
    expect(screen.getByTestId("certificate-row-cert-2")).toBeInTheDocument()
  })

  it("shows issue certificate action for READY state and opens modal", async () => {
    const user = userEvent.setup()

    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [validCertificate],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderComponent()

    const button = screen.getByRole("button", { name: "Issue End-Entity Certificate" })
    expect(button).toBeInTheDocument()

    await user.click(button)
    expect(screen.getByText("Issue End-Entity Modal")).toBeInTheDocument()
  })

  it("does not show issue certificate action when state is not READY", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [validCertificate],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderComponent("AWAITING_CERTIFICATE")

    expect(screen.queryByRole("button", { name: "Issue End-Entity Certificate" })).not.toBeInTheDocument()
  })

  it("shows issue certificate action in empty state when READY and opens modal", async () => {
    const user = userEvent.setup()

    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderComponent()

    const button = screen.getByRole("button", { name: "Issue End-Entity Certificate" })
    expect(button).toBeInTheDocument()

    await user.click(button)
    expect(screen.getByText("Issue End-Entity Modal")).toBeInTheDocument()
  })

  it("does not show issue certificate action in empty state when state is not READY", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderComponent("AWAITING_CERTIFICATE")

    expect(screen.queryByRole("button", { name: "Issue End-Entity Certificate" })).not.toBeInTheDocument()
  })

  it("renders correct column headers", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [validCertificate],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderComponent()

    expect(screen.getByText("CA ID")).toBeInTheDocument()
    expect(screen.getByText("ID")).toBeInTheDocument()
  })

  it("renders multiple certificates with different IDs", () => {
    const cert3: Certificate = {
      id: "cert-3",
      certificate_authority_id: "ca-1",
      project_id: "project-1",
    }

    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [validCertificate, validCertificate2, cert3],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderComponent()

    expect(screen.getByTestId("certificate-row-cert-1")).toBeInTheDocument()
    expect(screen.getByTestId("certificate-row-cert-2")).toBeInTheDocument()
    expect(screen.getByTestId("certificate-row-cert-3")).toBeInTheDocument()
  })

  it("uses default empty array when data is undefined", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    renderComponent()

    expect(screen.getByText("No Certificates issued by this Certificate Authority found")).toBeInTheDocument()
  })

  it("renders with different pcaId prop", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as never)

    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <PcaCertificatesListContainer pcaId="ca-1" pcaState="READY" />
      </I18nProvider>
    )

    expect(vi.mocked(trpcReact.services.pca.listCertificates.useQuery)).toHaveBeenCalledWith({
      project_id: "project-1",
      certificate_authority_id: "ca-1",
    })

    rerender(
      <I18nProvider i18n={i18n}>
        <PcaCertificatesListContainer pcaId="ca-2" pcaState="READY" />
      </I18nProvider>
    )

    expect(vi.mocked(trpcReact.services.pca.listCertificates.useQuery)).toHaveBeenCalledWith({
      project_id: "project-1",
      certificate_authority_id: "ca-2",
    })
  })
})
