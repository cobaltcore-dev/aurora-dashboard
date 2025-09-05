/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Juno contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react"
import { cleanup, render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { Filters, FiltersProps } from "./index"

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
}

const renderShell = ({ filters, filterSettings, onFilterChange }: FiltersProps) => ({
  user: userEvent.setup({ delay: 0 }),
  ...render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <Filters filters={filters} filterSettings={filterSettings} onFilterChange={onFilterChange} />
      </PortalProvider>
    </I18nProvider>
  ),
})

describe("Filters", () => {
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
    renderShell({ filters, filterSettings, onFilterChange: vi.fn() })
    expect(await screen.findByTestId("select-filterValue")).toBeInTheDocument()
    expect(await screen.findByTestId("combobox-filterValue")).toBeInTheDocument()
    expect(await screen.findByTestId("searchbar")).toBeInTheDocument()
  })

  it("should allow filtering by text", async () => {
    const onFilterChangeSpy = vi.fn()
    const { user } = renderShell({ filters, filterSettings, onFilterChange: onFilterChangeSpy })
    const searchbox = await screen.findByRole("searchbox")
    await user.type(searchbox, "Europe")
    const searchButton = await screen.findByRole("button", { name: "Search" })
    await user.click(searchButton)
    expect(onFilterChangeSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedFilters: [],
        searchTerm: "Europe",
      })
    )
  })

  it("should select filter and filter value", async () => {
    const onFilterChangeSpy = vi.fn()
    const { user } = renderShell({ filters, filterSettings, onFilterChange: onFilterChangeSpy })

    const filterSelect = await screen.findByTestId("select-filterValue")
    await user.click(filterSelect)
    await user.click(await screen.findByTestId("region"))

    const valueComboBox = await screen.findByTestId("combobox-filterValue")

    await user.click(valueComboBox.getElementsByClassName("juno-combobox-toggle")[0])

    expect(await screen.findByTestId("Europe")).toBeInTheDocument()
    await user.click(await screen.findByTestId("Europe"))

    expect(onFilterChangeSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedFilters: [{ name: "region", value: "Europe" }],
        searchTerm: "",
      })
    )
  })
})
