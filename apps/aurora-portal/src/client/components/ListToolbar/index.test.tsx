/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Juno contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { cleanup, render, screen, act } from "@testing-library/react"
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

const searchTerm = ""

const renderShell = ({ filterSettings, onFilter, onSearch, searchTerm }: ListToolbarProps) => ({
  user: userEvent.setup({ delay: 0 }),
  ...render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ListToolbar filterSettings={filterSettings} searchTerm={searchTerm} onFilter={onFilter} onSearch={onSearch} />
      </PortalProvider>
    </I18nProvider>
  ),
})

describe("ListToolbar", () => {
  beforeEach(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders the component with search, select and combobox", async () => {
    renderShell({ filterSettings, searchTerm, onFilter: vi.fn(), onSearch: vi.fn() })
    expect(await screen.findByTestId("select-filterValue")).toBeInTheDocument()
    expect(await screen.findByTestId("combobox-filterValue")).toBeInTheDocument()
    expect(await screen.findByTestId("searchbar")).toBeInTheDocument()
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
})
