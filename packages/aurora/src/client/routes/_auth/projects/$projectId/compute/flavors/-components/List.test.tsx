import { act, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { TrpcClient } from "@/client/trpcClient"
import { Flavors } from "./List"

vi.mock("@tanstack/react-router", () => ({ useSearch: () => ({}), useNavigate: () => vi.fn() }))
vi.mock("./FlavorListContainer", () => ({ FlavorListContainer: () => <div>Flavors loaded</div> }))
vi.mock("./CreateFlavorModal", () => ({ CreateFlavorModal: () => null }))
vi.mock("@/client/components/ListToolbar/SortInput", () => ({ SortInput: () => null }))

describe("Flavors toolbar", () => {
  it("uses the shared Search… placeholder", async () => {
    const client = {
      compute: {
        getFlavorsByProjectId: { query: vi.fn().mockResolvedValue({ flavors: [] }) },
        canUser: { query: vi.fn().mockResolvedValue([false, false, false, false, false, false]) },
      },
    } as unknown as TrpcClient
    await act(async () => {
      render(
        <I18nProvider i18n={i18n}>
          <Flavors client={client} project="project-1" />
        </I18nProvider>
      )
    })
    await screen.findByText("Flavors loaded")
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText("Search flavors...")).not.toBeInTheDocument()
  })

  it("shows the flavor count and last-updated info in the header", async () => {
    const client = {
      compute: {
        getFlavorsByProjectId: {
          query: vi.fn().mockResolvedValue({ flavors: [{ id: "f1" }, { id: "f2" }] }),
        },
        canUser: { query: vi.fn().mockResolvedValue([false, false, false, false, false, false]) },
      },
    } as unknown as TrpcClient
    await act(async () => {
      render(
        <I18nProvider i18n={i18n}>
          <Flavors client={client} project="project-1" />
        </I18nProvider>
      )
    })
    await screen.findByText("Flavors loaded")
    expect(screen.getByText("Showing 2 flavors")).toBeInTheDocument()
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })
})
