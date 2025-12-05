/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Juno contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ListToolbar, ListToolbarProps } from "./index"
const filters = [
  {
    displayName: "Category",
    filterName: "category",
    values: ["Finance", "Health", "Education"],
  },
  {
    displayName: "Status",
    filterName: "status",
    values: ["Active", "Inactive", "Pending"],
  },
  {
    displayName: "Region",
    filterName: "region",
    values: ["North America", "Europe", "Asia"],
  },
]

const filterSettings = {
  selectedFilters: [],
  searchTerm: "",
  filters,
}

const sortSettings = {
  sortBy: "name",
  sortDirection: "asc" as const,
  options: [
    { value: "name", label: "Name" },
    { value: "date", label: "Date" },
    { value: "status", label: "Status" },
  ],
}

const searchTerm = ""

const renderShell = ({ filterSettings, sortSettings, onFilter, onSort, onSearch, searchTerm }: ListToolbarProps) => ({
  user: userEvent.setup({ delay: 0 }),
  ...render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ListToolbar
          filterSettings={filterSettings}
          sortSettings={sortSettings}
          searchTerm={searchTerm}
          onFilter={onFilter}
          onSort={onSort}
          onSearch={onSearch}
        />
      </PortalProvider>
    </I18nProvider>
  ),
})

describe("ListToolbar", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the component with search, select and combobox (without sort controls)", async () => {
    renderShell({ filterSettings, searchTerm, onFilter: vi.fn(), onSearch: vi.fn() })
    expect(await screen.findByTestId("select-filterValue")).toBeInTheDocument()
    expect(await screen.findByTestId("combobox-filterValue")).toBeInTheDocument()
    expect(await screen.findByTestId("searchbar")).toBeInTheDocument()
    expect(screen.queryByTestId("sort-select")).not.toBeInTheDocument()
    expect(screen.queryByTestId("direction-toggle")).not.toBeInTheDocument()
  })

  it("renders the component with sort controls when sortSettings and onSort are provided", async () => {
    renderShell({ filterSettings, sortSettings, searchTerm, onFilter: vi.fn(), onSort: vi.fn(), onSearch: vi.fn() })
    expect(await screen.findByTestId("select-filterValue")).toBeInTheDocument()
    expect(await screen.findByTestId("combobox-filterValue")).toBeInTheDocument()
    expect(await screen.findByTestId("sort-select")).toBeInTheDocument()
    expect(await screen.findByTestId("direction-toggle")).toBeInTheDocument()
    expect(await screen.findByTestId("searchbar")).toBeInTheDocument()
  })

  it("renders the component without search when onSearch is not provided", async () => {
    renderShell({ filterSettings, sortSettings, onFilter: vi.fn(), onSort: vi.fn() })
    expect(await screen.findByTestId("select-filterValue")).toBeInTheDocument()
    expect(await screen.findByTestId("combobox-filterValue")).toBeInTheDocument()
    expect(await screen.findByTestId("sort-select")).toBeInTheDocument()
    expect(await screen.findByTestId("direction-toggle")).toBeInTheDocument()
    expect(screen.queryByTestId("searchbar")).not.toBeInTheDocument()
  })

  it("renders only filters when neither sort nor search are provided", async () => {
    renderShell({ filterSettings, onFilter: vi.fn() })
    expect(await screen.findByTestId("select-filterValue")).toBeInTheDocument()
    expect(await screen.findByTestId("combobox-filterValue")).toBeInTheDocument()
    expect(screen.queryByTestId("sort-select")).not.toBeInTheDocument()
    expect(screen.queryByTestId("direction-toggle")).not.toBeInTheDocument()
    expect(screen.queryByTestId("searchbar")).not.toBeInTheDocument()
  })

  it("should allow searching by text", async () => {
    const onSearchSpy = vi.fn()
    const { user } = renderShell({ filterSettings, searchTerm, onFilter: vi.fn(), onSearch: onSearchSpy })
    const searchbox = await screen.findByRole("searchbox")
    await user.type(searchbox, "Europe")
    const searchButton = await screen.findByRole("button", { name: "Search" })
    await user.click(searchButton)
    expect(onSearchSpy).toHaveBeenLastCalledWith("Europe")
  })

  it("should select filter and filter value", async () => {
    const onFilterChangeSpy = vi.fn()
    const { user } = renderShell({ filterSettings, searchTerm, onFilter: onFilterChangeSpy, onSearch: vi.fn() })

    const filterSelect = await screen.findByTestId("select-filterValue")
    await user.click(filterSelect)
    await user.click(await screen.findByTestId("region"))

    const valueComboBox = await screen.findByTestId("combobox-filterValue")

    await user.click(valueComboBox.getElementsByClassName("juno-combobox-toggle")[0])

    expect(await screen.findByTestId("Europe")).toBeInTheDocument()
    await user.click(await screen.findByTestId("Europe"))

    expect(onFilterChangeSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filters,
        selectedFilters: [{ name: "region", value: "Europe" }],
        searchTerm: "",
      })
    )
  })

  it("should change sort field", async () => {
    const onSortSpy = vi.fn()
    const { user } = renderShell({
      filterSettings,
      sortSettings,
      searchTerm,
      onFilter: vi.fn(),
      onSort: onSortSpy,
      onSearch: vi.fn(),
    })

    const sortSelect = await screen.findByTestId("sort-select")
    await user.click(sortSelect)
    await user.click(await screen.findByText("Date"))

    expect(onSortSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: "date",
        sortDirection: "asc",
      })
    )
  })

  it("should toggle sort direction", async () => {
    const onSortSpy = vi.fn()
    const { user } = renderShell({
      filterSettings,
      sortSettings,
      searchTerm,
      onFilter: vi.fn(),
      onSort: onSortSpy,
      onSearch: vi.fn(),
    })

    const directionButton = await screen.findByTestId("direction-toggle")
    await user.click(directionButton)

    expect(onSortSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: "name",
        sortDirection: "desc",
      })
    )
  })

  it("should debounce search input and call onSearch only once after 500ms", () => {
    vi.useFakeTimers()

    const onSearchSpy = vi.fn()
    renderShell({ onSearch: onSearchSpy })

    const searchbox = screen.getByRole("searchbox")

    fireEvent.input(searchbox, { target: { value: "test" } })

    expect(onSearchSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)

    expect(onSearchSpy).toHaveBeenCalledTimes(1)
    expect(onSearchSpy).toHaveBeenLastCalledWith("test")

    vi.useRealTimers()
  })
})
