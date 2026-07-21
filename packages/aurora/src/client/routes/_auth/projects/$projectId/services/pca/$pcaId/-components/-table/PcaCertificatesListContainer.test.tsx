import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { Certificate, CertificatesList } from "@/server/Services/types/pca"
import { trpcReact } from "@/client/trpcClient"
import { PcaCertificatesListContainer } from "./PcaCertificatesListContainer"

vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcReact: {
      ...actual.trpcReact,
      useUtils: vi.fn(() => ({
        services: {
          pca: {
            listCertificates: {
              invalidate: vi.fn(),
            },
          },
        },
      })),
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
    <div data-testid={`pca-certificate-row-${certificate.id}`}>
      <div>{certificate.certificate_authority_id}</div>
      <div>{certificate.id}</div>
    </div>
  ),
}))

vi.mock("../-modals/IssueEndEntityCertificateModal", () => ({
  IssueEndEntityCertificateModal: ({ open }: { open: boolean; onClose?: () => void }) =>
    open ? <div data-testid="issue-end-entity-modal">Issue End-Entity Modal</div> : null,
}))

const makeCertificates = (count: number): Certificate[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `cert-${index + 1}`,
    certificate_authority_id: "ca-1",
    project_id: "project-1",
  }))

const makeListResponse = (
  certificates: Certificate[],
  overrides: Partial<CertificatesList> = {}
): CertificatesList => ({
  certificates,
  links: [],
  ...overrides,
})

type MockQueryResult = {
  data: CertificatesList | undefined
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
}

const createMockQueryResult = (overrides: Partial<MockQueryResult> = {}) =>
  ({
    data: makeListResponse([]),
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  }) as ReturnType<typeof trpcReact.services.pca.listCertificates.useQuery>

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
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(createMockQueryResult())

    renderComponent()

    expect(vi.mocked(trpcReact.services.pca.listCertificates.useQuery)).toHaveBeenCalledWith({
      project_id: "project-1",
      certificate_authority_id: "ca-1",
      limit: 50,
      next_page_marker: undefined,
    })
  })

  it("renders loading state", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(
      createMockQueryResult({ isLoading: true })
    )

    renderComponent()

    expect(screen.getByText("Loading Certificates issued by Certificate Authority...")).toBeInTheDocument()
  })

  it("renders error state with error message", () => {
    const errorMessage = "Failed to fetch certificates"
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(
      createMockQueryResult({ isError: true, error: { message: errorMessage } })
    )

    renderComponent()

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it("renders default error message when no error details provided", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(
      createMockQueryResult({ isError: true, error: null })
    )

    renderComponent()

    expect(screen.getByText("Failed to load Certificates issued by Certificate Authority.")).toBeInTheDocument()
  })

  it("renders empty state when no certificates exist", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(createMockQueryResult())

    renderComponent()

    expect(screen.getByText("No Certificates issued by this Certificate Authority found")).toBeInTheDocument()
    expect(screen.getByText("There are no Certificates available for this Certificate Authority.")).toBeInTheDocument()
    expect(screen.getByTestId("no-pcas-certificates")).toBeInTheDocument()
  })

  it("renders data grid with certificates", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(
      createMockQueryResult({ data: makeListResponse([validCertificate, validCertificate2]) })
    )

    renderComponent()

    expect(screen.getByTestId("pca-certificate-row-cert-1")).toBeInTheDocument()
    expect(screen.getByTestId("pca-certificate-row-cert-2")).toBeInTheDocument()
  })

  it("shows issue certificate action for READY state and opens modal", async () => {
    const user = userEvent.setup()

    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(
      createMockQueryResult({ data: makeListResponse([validCertificate]) })
    )

    renderComponent()

    const button = screen.getByRole("button", { name: "Issue End-Entity Certificate" })
    expect(button).toBeInTheDocument()

    await user.click(button)
    expect(screen.getByTestId("issue-end-entity-modal")).toBeInTheDocument()
  })

  it("does not show issue certificate action when state is not READY", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(
      createMockQueryResult({ data: makeListResponse([validCertificate]) })
    )

    renderComponent("AWAITING_CERTIFICATE")

    expect(screen.queryByRole("button", { name: "Issue End-Entity Certificate" })).not.toBeInTheDocument()
  })

  it("shows issue certificate action in empty state when READY and opens modal", async () => {
    const user = userEvent.setup()

    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(createMockQueryResult())

    renderComponent()

    const button = screen.getByRole("button", { name: "Issue End-Entity Certificate" })
    expect(button).toBeInTheDocument()

    await user.click(button)
    expect(screen.getByTestId("issue-end-entity-modal")).toBeInTheDocument()
  })

  it("does not show issue certificate action in empty state when state is not READY", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(createMockQueryResult())

    renderComponent("AWAITING_CERTIFICATE")

    expect(screen.queryByRole("button", { name: "Issue End-Entity Certificate" })).not.toBeInTheDocument()
  })

  it("renders correct column headers", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(
      createMockQueryResult({ data: makeListResponse([validCertificate]) })
    )

    renderComponent()

    expect(screen.getByText("CA ID")).toBeInTheDocument()
    expect(screen.getByText("ID")).toBeInTheDocument()
  })

  it("renders multiple certificates with different IDs", () => {
    const cert3: Certificate = { id: "cert-3", certificate_authority_id: "ca-1", project_id: "project-1" }

    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(
      createMockQueryResult({ data: makeListResponse([validCertificate, validCertificate2, cert3]) })
    )

    renderComponent()

    expect(screen.getByTestId("pca-certificate-row-cert-1")).toBeInTheDocument()
    expect(screen.getByTestId("pca-certificate-row-cert-2")).toBeInTheDocument()
    expect(screen.getByTestId("pca-certificate-row-cert-3")).toBeInTheDocument()
  })

  it("does not render pagination when there is only one page", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(
      createMockQueryResult({ data: makeListResponse(makeCertificates(10)) })
    )

    renderComponent()

    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument()
  })

  it("renders pagination when the response includes a next page marker", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(
      createMockQueryResult({
        data: makeListResponse(makeCertificates(50), { next_page_marker: "next-marker" }),
      })
    )

    renderComponent()

    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
    expect(screen.getByTestId("pca-certificate-row-cert-1")).toBeInTheDocument()
    expect(screen.getByTestId("pca-certificate-row-cert-50")).toBeInTheDocument()
  })

  it("moves to the next page when next is clicked", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockImplementation((input) => {
      if (typeof input === "symbol") return createMockQueryResult()
      if (input.next_page_marker === "marker-page-2") {
        return createMockQueryResult({
          data: makeListResponse([{ id: "cert-51", certificate_authority_id: "ca-1", project_id: "project-1" }]),
        })
      }
      return createMockQueryResult({
        data: makeListResponse(makeCertificates(50), { next_page_marker: "marker-page-2" }),
      })
    })

    renderComponent()

    fireEvent.click(screen.getByRole("button", { name: /next/i }))

    expect(vi.mocked(trpcReact.services.pca.listCertificates.useQuery)).toHaveBeenLastCalledWith({
      project_id: "project-1",
      certificate_authority_id: "ca-1",
      limit: 50,
      next_page_marker: "marker-page-2",
    })
    expect(screen.queryByTestId("pca-certificate-row-cert-1")).not.toBeInTheDocument()
    expect(screen.getByTestId("pca-certificate-row-cert-51")).toBeInTheDocument()
  })

  it("uses default empty array when data is undefined", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(
      createMockQueryResult({ data: undefined })
    )

    renderComponent()

    expect(screen.getByText("No Certificates issued by this Certificate Authority found")).toBeInTheDocument()
  })

  it("renders with different pcaId prop", () => {
    vi.mocked(trpcReact.services.pca.listCertificates.useQuery).mockReturnValue(createMockQueryResult())

    const { rerender } = render(
      <I18nProvider i18n={i18n}>
        <PcaCertificatesListContainer pcaId="ca-1" pcaState="READY" />
      </I18nProvider>
    )

    expect(vi.mocked(trpcReact.services.pca.listCertificates.useQuery)).toHaveBeenCalledWith({
      project_id: "project-1",
      certificate_authority_id: "ca-1",
      limit: 50,
      next_page_marker: undefined,
    })

    rerender(
      <I18nProvider i18n={i18n}>
        <PcaCertificatesListContainer pcaId="ca-2" pcaState="READY" />
      </I18nProvider>
    )

    expect(vi.mocked(trpcReact.services.pca.listCertificates.useQuery)).toHaveBeenCalledWith({
      project_id: "project-1",
      certificate_authority_id: "ca-2",
      limit: 50,
      next_page_marker: undefined,
    })
  })
})
