import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import type { ReactNode } from "react"
import type { TrpcClient } from "@/client/trpcClient"
import type { FiltersInputProps } from "@/client/components/ListToolbar/FiltersInput"
import type { SelectedFilter } from "@/client/components/ListToolbar/types"
import { Images } from "./List"

const h = vi.hoisted(() => ({
  search: {} as Record<string, unknown>,
  navigate: vi.fn(),
  mainQuery: vi.fn(),
  sharedQuery: vi.fn(),
  filterNames: [] as string[],
}))

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useSearch: () => h.search,
  useNavigate: () => h.navigate,
}))

vi.mock("@/client/hooks", () => ({ useProjectId: () => "p1" }))
vi.mock("@/client/trpcClient", () => ({
  trpcReact: { compute: { listSharedImagesByMemberStatus: { useQuery: () => ({ data: [] }) } } },
}))
vi.mock("./ImageListView", () => ({ ImageListView: () => <div>Images loaded</div> }))
vi.mock("@/client/components/ListToolbar/SortInput", () => ({ SortInput: () => null }))
vi.mock("@/client/components/ListToolbar/FiltersInput", () => ({
  FiltersInput: ({ filters, onChange }: FiltersInputProps) => {
    h.filterNames = filters.map((filter) => filter.filterName)
    const filter = filters.find((entry) => entry.filterName === "image_type")
    return (
      <select
        aria-label="Type filter"
        value=""
        onChange={(event) => onChange({ name: "image_type", value: event.target.value })}
      >
        <option value="">Type</option>
        {filter?.values.map((value) => (
          <option key={value} value={value}>
            {filter.valueLabels?.[value] ?? value}
          </option>
        ))}
      </select>
    )
  },
}))
vi.mock("@/client/components/ListToolbar/SelectedFilters", () => ({
  SelectedFilters: ({
    selectedFilters,
    onDelete,
  }: {
    selectedFilters: SelectedFilter[]
    onDelete: (filter: SelectedFilter) => void
  }) => {
    const type = selectedFilters.find((filter) => filter.name === "image_type")
    return type ? <button onClick={() => onDelete(type)}>Remove Type</button> : null
  },
}))

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>
const client = {
  compute: {
    listImagesWithSearch: { query: h.mainQuery },
    listSharedImagesByMemberStatus: { query: h.sharedQuery },
    canUser: { query: async () => [false, false, false, false, false, false] },
  },
} as unknown as TrpcClient

describe("Images — Type filter navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.search = {}
    h.mainQuery.mockResolvedValue({ images: [], totalCount: 100 })
    h.sharedQuery.mockResolvedValue(Array.from({ length: 60 }, (_, index) => ({ id: String(index) })))
  })

  it.each(["all", "accepted", "pending"] as const)("restores Type from the URL in the %s tab", async (memberStatus) => {
    h.search = { image_type: "snapshot", memberStatus }
    await act(async () => {
      render(<Images client={client} project="p1" />, { wrapper })
    })

    await screen.findByText("Images loaded")
    const query = memberStatus === "all" ? h.mainQuery : h.sharedQuery
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ image_type: "snapshot" }))
    expect(h.filterNames.slice(0, 2)).toEqual(["status", "image_type"])
    if (memberStatus === "all") expect(h.filterNames[2]).toBe("visibility")
    expect(screen.queryByRole("option", { name: "All" })).not.toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Snapshot" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Images" })).toBeInTheDocument()
  })

  it("refreshes when only Type changes and resets pagination without losing other filters", async () => {
    h.search = { page: 2, status: "active", image_type: "snapshot", search: "ubuntu" }
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(<Images client={client} project="p1" />, { wrapper })
    })
    const { rerender } = view
    await screen.findByText("Images loaded")

    await act(async () => {
      fireEvent.change(screen.getByRole("combobox", { name: "Type filter" }), { target: { value: "images" } })
    })
    h.search = h.navigate.mock.lastCall![0].search(h.search)
    expect(h.search).toMatchObject({ status: "active", image_type: "in:snapshot,images", search: "ubuntu" })
    expect(h.search.page).toBeUndefined()
    await act(async () => {
      rerender(<Images client={client} project="p1" />)
    })

    await waitFor(() =>
      expect(h.mainQuery).toHaveBeenLastCalledWith(expect.objectContaining({ status: "active", marker: undefined }))
    )
    expect(h.mainQuery.mock.lastCall![0]).not.toHaveProperty("image_type")

    // A URL-only change models browser back/forward without changing other params.
    h.search = { ...h.search, image_type: "snapshot" }
    await act(async () => {
      rerender(<Images client={client} project="p1" />)
    })
    await waitFor(() =>
      expect(h.mainQuery).toHaveBeenLastCalledWith(expect.objectContaining({ image_type: "snapshot" }))
    )
  })

  it.each(["all", "accepted", "pending"] as const)(
    "restores both Type pills as unrestricted in the %s tab and narrows when one is removed",
    async (memberStatus) => {
      h.search = { image_type: "in:snapshot,images", memberStatus }
      let view!: ReturnType<typeof render>
      await act(async () => {
        view = render(<Images client={client} project="p1" />, { wrapper })
      })
      await screen.findByText("Images loaded")
      const query = memberStatus === "all" ? h.mainQuery : h.sharedQuery
      expect(query.mock.lastCall![0].image_type).toBeUndefined()

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Remove Type" }))
      })
      h.search = h.navigate.mock.lastCall![0].search(h.search)
      expect(h.search.image_type).toBe("images")
      await act(async () => {
        view.rerender(<Images client={client} project="p1" />)
      })
      await waitFor(() => expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ image_type: "images" })))
    }
  )

  it.each([undefined, "all", "backup", 1, true, ["snapshot"], {}])(
    "does not create a Type pill or restriction for %j",
    async (image_type) => {
      h.search = { image_type }
      await act(async () => {
        render(<Images client={client} project="p1" />, { wrapper })
      })
      await screen.findByText("Images loaded")
      expect(screen.queryByRole("button", { name: "Remove Type" })).not.toBeInTheDocument()
      expect(h.mainQuery.mock.lastCall![0].image_type).toBeUndefined()
    }
  )

  it("removes Type without clearing other filters", async () => {
    h.search = { status: "active", image_type: "snapshot" }
    let view!: ReturnType<typeof render>
    await act(async () => {
      view = render(<Images client={client} project="p1" />, { wrapper })
    })
    const { rerender } = view
    await screen.findByText("Images loaded")

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Remove Type" }))
    })
    h.search = h.navigate.mock.lastCall![0].search(h.search)
    expect(h.search.image_type).toBeUndefined()
    expect(h.search.status).toBe("active")
    await act(async () => {
      rerender(<Images client={client} project="p1" />)
    })

    await waitFor(() =>
      expect(h.mainQuery).toHaveBeenLastCalledWith(expect.not.objectContaining({ image_type: "snapshot" }))
    )
  })
})
