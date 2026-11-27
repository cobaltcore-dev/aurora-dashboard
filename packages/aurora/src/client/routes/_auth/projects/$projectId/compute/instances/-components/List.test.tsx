import { act, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { TrpcClient } from "@/client/trpcClient"
import { Instances } from "./List"

const h = vi.hoisted(() => ({
  instancesResult: { servers: [] as unknown[] } as Record<string, unknown>,
}))

vi.mock("@tanstack/react-router", () => ({ useSearch: () => ({}), useNavigate: () => vi.fn() }))
vi.mock("../apiHelpers", () => ({
  createInstancesPromise: vi.fn(() => Promise.resolve(h.instancesResult)),
  createPermissionsPromise: vi.fn().mockResolvedValue({ canList: true }),
}))
vi.mock("./InstanceListView", () => ({ InstanceListView: () => <div>Instances loaded</div> }))
vi.mock("@/client/components/ListToolbar/SortInput", () => ({ SortInput: () => null }))
vi.mock("@/client/components/ListToolbar/FiltersInput", () => ({ FiltersInput: () => null }))

const renderList = async () => {
  await act(async () => {
    render(
      <I18nProvider i18n={i18n}>
        <Instances client={{} as TrpcClient} project="project-1" />
      </I18nProvider>
    )
  })
  await screen.findByText("Instances loaded")
}

describe("Instances toolbar", () => {
  beforeEach(() => {
    h.instancesResult = { servers: [] }
  })

  it("uses the shared Search… placeholder", async () => {
    await renderList()
    expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText("Search instances...")).not.toBeInTheDocument()
  })

  it("shows the instance count in the header", async () => {
    h.instancesResult = { servers: [{ id: "a" }, { id: "b" }, { id: "c" }], listForbidden: false }
    await renderList()
    expect(screen.getByText("Showing 3 instances")).toBeInTheDocument()
  })

  it("shows the last-updated info when the list resolves with a timestamp", async () => {
    h.instancesResult = { servers: [{ id: "a" }], listForbidden: false, resolvedAt: Date.now() }
    await renderList()
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
  })

  it("omits the last-updated info when no timestamp is present", async () => {
    h.instancesResult = { servers: [{ id: "a" }], listForbidden: false }
    await renderList()
    expect(screen.queryByText(/Last updated:/)).not.toBeInTheDocument()
  })
})
