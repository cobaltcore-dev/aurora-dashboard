import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { CertificateAuthority } from "@/server/Services/types/pca"
import { trpcReact } from "@/client/trpcClient"
import { PcaListContainer } from "./PcaListContainer"

const mockProjectId = "project-123"

vi.mock("@/client/hooks", () => ({
  useProjectId: () => mockProjectId,
}))

vi.mock("./-table/PcaTableRow", () => ({
  PcaTableRow: ({ pca }: { pca: CertificateAuthority }) => <div data-testid={`pca-row-${pca.id}`}>{pca.id}</div>,
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
          list: {
            ...actual.trpcReact.services.pca.list,
            useQuery: vi.fn(),
          },
        },
      },
    },
  }
})

type MockListQueryResult = {
  data: CertificateAuthority[] | undefined
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

  it("renders empty state", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(createMockListQueryResult({ data: [] }))

    renderComponent()

    expect(screen.getByText("No PCAs found")).toBeInTheDocument()
    expect(screen.getByText("There are no PCAs available for this project.")).toBeInTheDocument()
  })

  it("renders rows when data exists and queries with project id", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(
      createMockListQueryResult({
        data: [
          { id: "pca-1", project_id: mockProjectId, state: "READY" },
          { id: "pca-2", project_id: mockProjectId, state: "FAILED" },
        ],
      })
    )

    renderComponent()

    expect(screen.getByTestId("pca-row-pca-1")).toBeInTheDocument()
    expect(screen.getByTestId("pca-row-pca-2")).toBeInTheDocument()
    expect(vi.mocked(trpcReact.services.pca.list.useQuery)).toHaveBeenCalledWith({ project_id: mockProjectId })
  })

  it("does not render pagination when there is only one page", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(
      createMockListQueryResult({
        data: makePcas(10),
      })
    )

    renderComponent()

    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument()
  })

  it("renders pagination and shows only the first 50 rows on the first page", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(
      createMockListQueryResult({
        data: makePcas(51),
      })
    )

    renderComponent()

    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument()
    expect(screen.getByTestId("pca-row-pca-1")).toBeInTheDocument()
    expect(screen.getByTestId("pca-row-pca-50")).toBeInTheDocument()
    expect(screen.queryByTestId("pca-row-pca-51")).not.toBeInTheDocument()
  })

  it("moves to the next page when next is clicked", () => {
    vi.mocked(trpcReact.services.pca.list.useQuery).mockReturnValue(
      createMockListQueryResult({
        data: makePcas(51),
      })
    )

    renderComponent()

    fireEvent.click(screen.getByRole("button", { name: /next/i }))

    expect(screen.queryByTestId("pca-row-pca-1")).not.toBeInTheDocument()
    expect(screen.getByTestId("pca-row-pca-51")).toBeInTheDocument()
  })
})
