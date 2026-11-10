import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { ImageNameHover } from "./ImageNameHover"

// Mutable query result returned by the mocked getImageById query.
let queryResult: { data: unknown; status: string } = { data: undefined, status: "pending" }

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    compute: {
      getImageById: { useQuery: () => queryResult },
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

const renderIt = () => render(<ImageNameHover imageId="img-123" projectId="p1" />, { wrapper: TestingProvider })

describe("ImageNameHover", () => {
  beforeAll(() => {
    i18n.load({ en: {} })
    i18n.activate("en")
  })

  beforeEach(() => {
    vi.clearAllMocks()
    queryResult = { data: undefined, status: "pending" }
  })

  it("shows the id with a copy control while the name is still loading", () => {
    renderIt()
    expect(screen.getByText("img-123")).toBeInTheDocument()
    expect(screen.queryByTestId("image-link")).not.toBeInTheDocument()
    // ClipboardText exposes a copy button labelled with the full id.
    expect(screen.getByRole("button", { name: /Copy img-123 to clipboard/i })).toBeInTheDocument()
  })

  it("links the resolved name once the image resolves", () => {
    queryResult = { data: { id: "img-123", name: "ubuntu-22.04" }, status: "success" }
    renderIt()
    expect(screen.getByTestId("image-link")).toHaveTextContent("ubuntu-22.04")
    // No copy control on the resolved (link) path.
    expect(screen.queryByRole("button", { name: /Copy/i })).not.toBeInTheDocument()
  })

  it("shows the id with a copy control (no link) when the image is not accessible", () => {
    queryResult = { data: undefined, status: "error" }
    renderIt()
    expect(screen.getByText("img-123")).toBeInTheDocument()
    expect(screen.queryByTestId("image-link")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Copy img-123 to clipboard/i })).toBeInTheDocument()
  })
})
