import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { TRPCClientError } from "@trpc/client"
import { ImageNameHover } from "./ImageNameHover"

// Mutable query result + a spy that records the `enabled` option per render.
let queryResult: { data: unknown; status: string; error: unknown } = {
  data: undefined,
  status: "pending",
  error: null,
}
const useQuerySpy = vi.fn()

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    compute: {
      getImageById: {
        useQuery: (input: unknown, opts: { enabled?: boolean }) => {
          useQuerySpy(opts?.enabled)
          return queryResult
        },
      },
    },
  },
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a data-testid="image-link">{children}</a>,
}))

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const render1 = (eager = false, open?: boolean) =>
  render(<ImageNameHover imageId="img-123" projectId="p1" eager={eager} open={open} />, { wrapper: TestingProvider })

describe("ImageNameHover", () => {
  beforeAll(() => {
    i18n.load({ en: {} })
    i18n.activate("en")
  })

  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: undefined, status: "pending", error: null }
  })

  it("shows the id as plain text (no link) before the name resolves", () => {
    render1()
    expect(screen.getByText("img-123")).toBeInTheDocument()
    expect(screen.queryByTestId("image-link")).not.toBeInTheDocument()
  })

  it("does not enable the query until hovered (lazy mode)", () => {
    render1(false)
    expect(useQuerySpy).toHaveBeenCalled()
    expect(useQuerySpy.mock.calls.every(([enabled]) => enabled === false)).toBe(true)
  })

  it("enables the query immediately in eager mode", () => {
    render1(true)
    expect(useQuerySpy.mock.calls.some(([enabled]) => enabled === true)).toBe(true)
  })

  it("links to the image only once the name resolves", () => {
    queryResult = { data: { id: "img-123", name: "ubuntu-22.04" }, status: "success", error: null }
    render1(true, true)
    expect(screen.getByTestId("image-link")).toHaveTextContent("ubuntu-22.04")
  })

  it("shows the id as plain text (no link) when the image is not accessible (404)", () => {
    queryResult = {
      data: undefined,
      status: "error",
      error: new TRPCClientError("not found", { result: { error: { data: { code: "NOT_FOUND" } } } } as never),
    }
    render1(true, true)
    expect(screen.getByText("Image not accessible in this project")).toBeInTheDocument()
    expect(screen.queryByTestId("image-link")).not.toBeInTheDocument()
    // The raw id is still shown as plain text.
    expect(screen.getByText("img-123")).toBeInTheDocument()
  })

  it("showIdAsLabel: links the id (no name, no icon) once reachable", () => {
    queryResult = { data: { id: "img-123", name: "ubuntu-22.04" }, status: "success", error: null }
    render(<ImageNameHover imageId="img-123" projectId="p1" eager showIdAsLabel />, { wrapper: TestingProvider })
    const link = screen.getByTestId("image-link")
    // Label is the id, not the resolved name.
    expect(link).toHaveTextContent("img-123")
    expect(screen.queryByText("ubuntu-22.04")).not.toBeInTheDocument()
    // No info icon in this mode.
    expect(screen.queryByLabelText("Resolve image name")).not.toBeInTheDocument()
  })

  it("showIdAsLabel: plain id (no link) when not reachable", () => {
    queryResult = {
      data: undefined,
      status: "error",
      error: new TRPCClientError("not found", { result: { error: { data: { code: "NOT_FOUND" } } } } as never),
    }
    render(<ImageNameHover imageId="img-123" projectId="p1" eager showIdAsLabel />, { wrapper: TestingProvider })
    expect(screen.getByText("img-123")).toBeInTheDocument()
    expect(screen.queryByTestId("image-link")).not.toBeInTheDocument()
  })
})
