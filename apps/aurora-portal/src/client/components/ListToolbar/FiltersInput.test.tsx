/*
 * SPDX-FileCopyrightText: 2024 SAP SE or an SAP affiliate company and Juno contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
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
const mockOnClear = vi.fn()

describe("FiltersInput", () => {
  beforeEach(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const setup = (props = {}) => {
    return render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <FiltersInput filters={mockFilters} onChange={mockOnChange} onClear={mockOnClear} {...props} />
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

  it("should render the Clear all button", async () => {
    setup()

    const clearButton = await screen.findByText("Clear all")
    expect(clearButton).toBeInTheDocument()
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

  it("should call onClear when Clear all button is clicked", async () => {
    const user = userEvent.setup({ delay: 0 })

    setup()

    const clearButton = await screen.findByText("Clear all")
    await user.click(clearButton)

    expect(mockOnClear).toHaveBeenCalledTimes(1)
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

  it("should apply custom inputWrapperProps", async () => {
    setup({
      inputWrapperProps: {
        "data-testid": "custom-wrapper",
        className: "custom-wrapper-class",
      },
    })

    const wrapper = await screen.findByTestId("custom-wrapper")
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass("custom-wrapper-class")
  })

  it("should apply custom selectInputProps", async () => {
    setup({
      selectInputProps: {
        className: "custom-select-class",
      },
    })

    const filterSelect = await screen.findByTestId("select-filterValue")
    expect(filterSelect).toHaveClass("custom-select-class")
  })

  it("should apply custom comboBoxInputProps", async () => {
    setup({
      comboBoxInputProps: {
        className: "custom-combobox-class",
      },
    })

    const comboBoxInput = screen.getByRole("combobox")
    expect(comboBoxInput).toHaveClass("custom-combobox-class")
  })

  it("should apply custom clearButtonProps", async () => {
    setup({
      clearButtonProps: {
        className: "custom-clear-button",
        variant: "primary",
      },
    })

    const clearButton = await screen.findByText("Clear all")
    expect(clearButton).toHaveClass("custom-clear-button")
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
          <FiltersInput filters={filtersWithEmpty} onChange={mockOnChange} onClear={mockOnClear} />
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
          <FiltersInput filters={filtersWithEmptyStrings} onChange={mockOnChange} onClear={mockOnClear} />
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
