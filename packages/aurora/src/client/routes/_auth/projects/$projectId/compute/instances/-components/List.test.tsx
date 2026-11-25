import { act, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { TrpcClient } from "@/client/trpcClient"
import { Instances } from "./List"

vi.mock("@tanstack/react-router", () => ({ useSearch: () => ({}), useNavigate: () => vi.fn() }))
vi.mock("../apiHelpers", () => ({
  createInstancesPromise: vi.fn().mockResolvedValue({ servers: [] }),
  createPermissionsPromise: vi.fn().mockResolvedValue({ canList: true }),
}))
vi.mock("./InstanceListView", () => ({ InstanceListView: () => <div>Instances loaded</div> }))
vi.mock("@/client/components/ListToolbar/SortInput", () => ({ SortInput: () => null }))
vi.mock("@/client/components/ListToolbar/FiltersInput", () => ({ FiltersInput: () => null }))

describe("Instances toolbar", () => {
  it("uses the shared Search… placeholder", async () => {
    await act(async () => {
      render(
        <I18nProvider i18n={i18n}>
          <Instances client={{} as TrpcClient} project="project-1" />
        </I18nProvider>
      )
    })
    await screen.findByText("Instances loaded")
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText("Search instances...")).not.toBeInTheDocument()
  })
})
