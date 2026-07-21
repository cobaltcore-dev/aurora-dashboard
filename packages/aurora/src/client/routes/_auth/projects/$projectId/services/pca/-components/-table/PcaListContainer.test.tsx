import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { CertificateAuthority, CertificateAuthoritiesList } from "@/server/Services/types/pca"
import { trpcReact } from "@/client/trpcClient"
import { PcaListContainer } from "./PcaListContainer"

const mockProjectId = "project-123"

vi.mock("@/client/hooks", () => ({
  useProjectId: () => mockProjectId,
}))

vi.mock("./-table/PcaTableRow", () => ({
  PcaTableRow: ({ pca }: { pca: CertificateAuthority }) => <div data-testid={`pca-row-${pca.id}`}>{pca.id}</div>,
}))

vi.mock("../-modals/CreatePcaModal", () => ({
  CreatePcaModal: ({ open }: { open: boolean }) => (open ? <div data-testid="create-pca-modal" /> : null),
}))

vi.mock("@/client/trpcClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/client/trpcClient")>()
  return {
    ...actual,
    trpcReact: {
      ...actual.trpcReact,
      useUtils: vi.fn(() => ({
        services: {
          pca: {
            list: {
              invalidate: vi.fn(),
            },
          },
        },
      })),
      services: {
        ...actual.trpcReact.services,
        pca: {
          ...actual.trpcReact.services.pca,
          list: {
            ...actual.trpcReact.services.pca.list,
            useQuery: vi.fn(),
          },
          create: {
            useMutation: vi.fn(() => ({
              isPending: false,
              mutateAsync: vi.fn().mockResolvedValue({ id: "pca-123" }),
              reset: vi.fn(),
              error: null,
            })),
          },
        },
      },
    },
  }
})

type MockListQueryResult = {
  data: CertificateAuthoritiesList | undefined
  isLoading: boolean
  isError: boolean
  error: { message?: string } | null
  trpc: { path: string }
}

const createMockListQueryResult = (overrides: Partial<MockListQueryResult> = {}) =>
  ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    trpc: { path: "services.pca.list" },
    ...overrides,
  }) as ReturnType<typeof trpcReact.services.pca.list.useQuery>

const makePcas = (count: number): CertificateAuthority[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `pca-${index + 1}`,
    project_id: mockProjectId,
    state: "READY",
  }))

const makeListResponse = (
  certificateAuthorities: CertificateAuthority[],
  overrides: Partial<CertificateAuthoritiesList> = {}
): CertificateAuthoritiesList => ({
  certificate_authorities: certificateAuthorities,
  links: [],
  ...overrides,
})

const renderComponent = () =>
  render(
    <I18nProvider i18n={i18n}>
      <PcaListContainer />
    </I18nProvider>
  )

describe("PcaListContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders loading state", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(createMockListQueryResult({ isLoading: true }))

    renderComponent()

    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("renders error state", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(
      createMockListQueryResult({
        isError: true,
        error: { message: "Request failed" },
      })
    )

    renderComponent()

    expect(screen.getByText("Request failed")).toBeInTheDocument()
  })

  it("renders empty state with create button", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(
      createMockListQueryResult({ data: makeListResponse([]) })
    )

    renderComponent()

    expect(screen.getByText("No PCAs found")).toBeInTheDocument()
    expect(screen.getByText("There are no PCAs available for this project.")).toBeInTheDocument()
    expect(screen.getByText("Create Certificate Authority")).toBeInTheDocument()
  })

  it("renders rows when data exists and queries with project id", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(
      createMockListQueryResult({
        data: makeListResponse([
          { id: "pca-1", project_id: mockProjectId, state: "READY" },
          { id: "pca-2", project_id: mockProjectId, state: "FAILED" },
        ]),
      })
    )

    renderComponent()

    expect(screen.getByTestId("pca-row-pca-1")).toBeInTheDocument()
    expect(screen.getByTestId("pca-row-pca-2")).toBeInTheDocument()
    expect(screen.getByText("Create Certificate Authority")).toBeInTheDocument()
    expect(vi.mocked(trpcReact.services.pca.list.useQuery)).toHaveBeenCalledWith({
      project_id: mockProjectId,
      limit: 50,
      next_page_marker: undefined,
    })
  })

  it("does not render pagination when there is only one page", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(
      createMockListQueryResult({
        data: makeListResponse(makePcas(10)),
      })
    )

    renderComponent()

    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument()
  })

  it("renders pagination when the response includes a next page marker", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(
      createMockListQueryResult({
        data: makeListResponse(makePcas(10), { next_page_marker: "next-marker" }),
      })
    )

    renderComponent()

    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
    expect(screen.getByTestId("pca-row-pca-1")).toBeInTheDocument()
    expect(screen.getByTestId("pca-row-pca-10")).toBeInTheDocument()
  })

  it("opens create modal when create button is clicked", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(
      createMockListQueryResult({ data: makeListResponse([]) })
    )

    renderComponent()

    expect(screen.queryByTestId("create-pca-modal")).not.toBeInTheDocument()
    fireEvent.click(screen.getByText("Create Certificate Authority"))
    expect(screen.getByTestId("create-pca-modal")).toBeInTheDocument()
  })

  it("moves to the next page when next is clicked", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockImplementation((input) => {
      if (typeof input === "symbol") return createMockListQueryResult()
      if (input.next_page_marker === "marker-page-2") {
        return createMockListQueryResult({
          data: makeListResponse([{ id: "pca-11", project_id: mockProjectId, state: "READY" }]),
        })
      }

      return createMockListQueryResult({
        data: makeListResponse(makePcas(10), {
          next_page_marker: "marker-page-2",
        }),
      })
    })

    renderComponent()

    fireEvent.click(screen.getByRole("button", { name: /next/i }))

    expect(vi.mocked(trpcReact.services.pca.list.useQuery)).toHaveBeenLastCalledWith({
      project_id: mockProjectId,
      limit: 50,
      next_page_marker: "marker-page-2",
    })
    expect(screen.queryByTestId("pca-row-pca-1")).not.toBeInTheDocument()
    expect(screen.getByTestId("pca-row-pca-11")).toBeInTheDocument()
  })
})
