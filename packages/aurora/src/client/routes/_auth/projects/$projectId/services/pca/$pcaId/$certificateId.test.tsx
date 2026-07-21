import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { RouteComponent } from "./$certificateId"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({
    staticData: {},
    useParams: () => ({ projectId: "project-1", pcaId: "ca-1", certificateId: "cert-1" }),
    useRouteContext: () => ({}),
  }),
  useNavigate: () => mockNavigate,
}))

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
          getByIdCertificate: {
            ...actual.trpcReact.services.pca.getByIdCertificate,
            useQuery: vi.fn(),
          },
        },
      },
    },
  }
})

const renderComponent = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <RouteComponent />
      </PortalProvider>
    </I18nProvider>
  )

const mockQuery = (overrides: object) =>
  vi.mocked(trpcReact.services.pca.getByIdCertificate.useQuery).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as never)

describe("$certificateId page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders loading state", () => {
    mockQuery({ isLoading: true })
    renderComponent()

    expect(screen.getByText("Loading Certificate Details...")).toBeInTheDocument()
  })

  it("renders error state with message", () => {
    mockQuery({ isError: true, error: { message: "Not found" } })
    renderComponent()

    expect(screen.getByText("Not found")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Back to Certificate Authorities Details page" })).toBeInTheDocument()
  })

  it("renders not-found state", () => {
    mockQuery({ data: undefined })
    renderComponent()

    expect(screen.getByText("Certificate not found")).toBeInTheDocument()
  })

  it("renders certificate details", () => {
    mockQuery({
      data: {
        id: "cert-1",
        certificate_authority_id: "ca-1",
        project_id: "project-1",
        certificate: {
          pem: "-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----",
          validity: { not_before: 0, not_after: 86400 },
        },
        csr: "-----BEGIN CERTIFICATE REQUEST-----\nABC\n-----END CERTIFICATE REQUEST-----",
        configuration: { validity: { not_before: 0, not_after: 86400 } },
      },
    })
    renderComponent()

    expect(screen.getByText("cert-1 Certificate Details")).toBeInTheDocument()
    expect(screen.getByText("ca-1")).toBeInTheDocument()
    expect(screen.getByText("1 days")).toBeInTheDocument()
  })

  it("navigates back on error back button click", async () => {
    const user = userEvent.setup()
    mockQuery({ isError: true, error: { message: "error" } })
    renderComponent()

    await user.click(screen.getByRole("button", { name: "Back to Certificate Authorities Details page" }))

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/projects/$projectId/services/pca/$pcaId",
      params: { projectId: "project-1", pcaId: "ca-1" },
    })
  })
})
