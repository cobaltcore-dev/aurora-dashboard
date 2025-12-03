/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Juno contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { FiltersInput } from "./FiltersInput"

const mockFilters = [
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
    values: ["America", "Europe", "Asia"],
  },
]

const mockOnChange = vi.fn()

describe("FiltersInput", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  const setup = (props = {}) => {
    return render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <FiltersInput filters={mockFilters} onChange={mockOnChange} {...props} />
        </PortalProvider>
      </I18nProvider>
    )
  }

  it("should render the component with filter input dropdown", async () => {
    setup()

    const filterSelect = await screen.findByTestId("select-filterValue")
    expect(filterSelect).toBeInTheDocument()

    const valueComboBox = await screen.findByTestId("combobox-filterValue")
    expect(valueComboBox).toBeInTheDocument()
  })

  it("displays all filter options in the select dropdown", async () => {
    setup()

    expect(await screen.findByTestId("category")).toBeInTheDocument()
    expect(await screen.findByTestId("status")).toBeInTheDocument()
    expect(await screen.findByTestId("region")).toBeInTheDocument()
  })

  it("should show values in combobox when filter is selected", async () => {
    const user = userEvent.setup({ delay: 0 })

    setup()

    const filterSelect = await screen.findByTestId("select-filterValue")
    await user.click(filterSelect)
    await user.click(await screen.findByTestId("region"))

    const valueComboBox = await screen.findByTestId("combobox-filterValue")
    await user.click(valueComboBox.getElementsByClassName("juno-combobox-toggle")[0])

    expect(await screen.findByTestId("Asia")).toBeInTheDocument()
    expect(await screen.findByTestId("America")).toBeInTheDocument()
    expect(await screen.findByTestId("Europe")).toBeInTheDocument()
  })

  it("should call onChange when a filter value is selected", async () => {
    const user = userEvent.setup({ delay: 0 })

    setup()

    // Select a filter
    const filterSelect = await screen.findByTestId("select-filterValue")
    await user.click(filterSelect)
    await user.click(await screen.findByTestId("status"))

    // Select a value
    const valueComboBox = await screen.findByTestId("combobox-filterValue")
    await user.click(valueComboBox.getElementsByClassName("juno-combobox-toggle")[0])
    await user.click(await screen.findByTestId("Active"))

    expect(mockOnChange).toHaveBeenCalledWith({
      name: "status",
      value: "Active",
    })
  })

  it("should disable combobox when no filter is selected", async () => {
    setup()

    const valueComboBox = await screen.findByTestId("combobox-filterValue")
    expect(valueComboBox).toHaveAttribute("data-headlessui-state", "disabled")
  })

  it("should enable combobox when a filter is selected", async () => {
    const user = userEvent.setup({ delay: 0 })

    setup()

    const filterSelect = await screen.findByTestId("select-filterValue")
    await user.click(filterSelect)
    await user.click(await screen.findByTestId("category"))

    const valueComboBox = await screen.findByTestId("combobox-filterValue")
    expect(valueComboBox).not.toHaveAttribute("data-headlessui-state", "disabled")
  })

  it("should not call onChange when filter value is empty", async () => {
    const user = userEvent.setup({ delay: 0 })

    setup()

    // Select a filter
    const filterSelect = await screen.findByTestId("select-filterValue")
    await user.click(filterSelect)
    await user.click(await screen.findByTestId("category"))

    // ComboBox onChange is called but our onChange should not be triggered with empty value
    mockOnChange.mockClear()

    const valueComboBox = await screen.findByTestId("combobox-filterValue")
    const input = valueComboBox.querySelector("input")
    if (input) {
      await user.clear(input)
    }

    // onChange should not be called for empty values
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it("should handle filters with empty values array", async () => {
    const user = userEvent.setup({ delay: 0 })

    const filtersWithEmpty = [
      {
        displayName: "Empty Filter",
        filterName: "empty",
        values: [],
      },
    ]

    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <FiltersInput filters={filtersWithEmpty} onChange={mockOnChange} />
        </PortalProvider>
      </I18nProvider>
    )

    const filterSelect = await screen.findByTestId("select-filterValue")
    await user.click(filterSelect)
    await user.click(await screen.findByTestId("empty"))

    const valueComboBox = await screen.findByTestId("combobox-filterValue")
    await user.click(valueComboBox.getElementsByClassName("juno-combobox-toggle")[0])

    // Should not have any options
    expect(screen.queryByRole("option")).not.toBeInTheDocument()
  })

  it("should filter out empty string values from filter values", async () => {
    const user = userEvent.setup({ delay: 0 })

    const filtersWithEmptyStrings = [
      {
        displayName: "Mixed Filter",
        filterName: "mixed",
        values: ["Valid", "", "Another", ""],
      },
    ]

    render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <FiltersInput filters={filtersWithEmptyStrings} onChange={mockOnChange} />
        </PortalProvider>
      </I18nProvider>
    )

    const filterSelect = await screen.findByTestId("select-filterValue")
    await user.click(filterSelect)
    await user.click(await screen.findByTestId("mixed"))

    const valueComboBox = await screen.findByTestId("combobox-filterValue")
    await user.click(valueComboBox.getElementsByClassName("juno-combobox-toggle")[0])

    // Should only show non-empty values
    expect(await screen.findByTestId("Valid")).toBeInTheDocument()
    expect(await screen.findByTestId("Another")).toBeInTheDocument()
  })

  it("should reset selected filter value after onChange", async () => {
    const user = userEvent.setup({ delay: 0 })

    setup()

    // Select a filter
    const filterSelect = await screen.findByTestId("select-filterValue")
    await user.click(filterSelect)
    await user.click(await screen.findByTestId("category"))

    // Select a value
    const valueComboBox = await screen.findByTestId("combobox-filterValue")
    await user.click(valueComboBox.getElementsByClassName("juno-combobox-toggle")[0])
    await user.click(await screen.findByTestId("Finance"))

    // Wait for the setTimeout to reset the value
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    // The combobox should be reset (value should be empty)
    const input = valueComboBox.querySelector("input")
    expect(input).toHaveValue("")
  })
})
