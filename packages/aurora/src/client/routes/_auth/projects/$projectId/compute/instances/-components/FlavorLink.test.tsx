import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll } from "vitest"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import type { Server } from "@/server/Compute/types/server"
import { FlavorLink } from "./FlavorLink"

// Flavor id is resolved by matching original_name against the project flavor list.
let flavorList: { id: string; name: string }[] = [{ id: "flv-1", name: "m1.small" }]
vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    compute: {
      getFlavorsByProjectId: { useQuery: () => ({ data: { flavors: flavorList } }) },
    },
  },
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a data-testid="flavor-link">{children}</a>,
}))

const TestingProvider = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

const makeServer = (overrides: Partial<Server> = {}): Server =>
  ({ id: "srv-1", name: "web-1", flavor: { original_name: "m1.small" }, ...overrides }) as Server

describe("FlavorLink", () => {
  beforeAll(() => {
    i18n.load({ en: {} })
    i18n.activate("en")
  })

  it("renders the flavor name as a link when the id resolves", () => {
    flavorList = [{ id: "flv-1", name: "m1.small" }]
    render(<FlavorLink instance={makeServer()} projectId="p1" />, { wrapper: TestingProvider })
    expect(screen.getByTestId("flavor-link")).toHaveTextContent("m1.small")
  })

  it("renders the flavor name as plain text when the id cannot be resolved", () => {
    flavorList = [] // no match for original_name
    render(<FlavorLink instance={makeServer()} projectId="p1" />, { wrapper: TestingProvider })
    expect(screen.getByText("m1.small")).toBeInTheDocument()
    expect(screen.queryByTestId("flavor-link")).not.toBeInTheDocument()
  })
})
