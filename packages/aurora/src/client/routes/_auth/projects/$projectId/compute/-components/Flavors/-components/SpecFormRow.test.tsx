import { render, screen, act, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { SpecFormRow } from "./SpecFormRow"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("SpecFormRow", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })
  })

  const createDefaultProps = () => ({
    specKey: "testKey",
    value: "testValue",
    errors: {} as { key?: string; value?: string },
    isLoading: false,
    onKeyChange: vi.fn(),
    onValueChange: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
  })

  it("renders form inputs correctly", () => {
    const props = createDefaultProps()

    render(<SpecFormRow {...props} />, {
      wrapper: TestingProvider,
    })

    const keyInput = screen.getByDisplayValue("testKey")
    const valueInput = screen.getByDisplayValue("testValue")

    expect(keyInput).toBeInTheDocument()
    expect(valueInput).toBeInTheDocument()
  })

  it("handles empty key and value", () => {
    const props = {
      ...createDefaultProps(),
      specKey: "",
      value: "",
    }

    render(<SpecFormRow {...props} />, {
      wrapper: TestingProvider,
    })

    const keyInput = screen.getByPlaceholderText("Enter key")
    const valueInput = screen.getByPlaceholderText("Enter value")

    expect(keyInput).toHaveValue("")
    expect(valueInput).toHaveValue("")
  })

  it("displays validation errors", () => {
    const props = {
      ...createDefaultProps(),
      errors: {
        key: "Key is required.",
        value: "Value is required.",
      },
    }

    render(<SpecFormRow {...props} />, {
      wrapper: TestingProvider,
    })

    expect(screen.getByText("Key is required.")).toBeInTheDocument()
    expect(screen.getByText("Value is required.")).toBeInTheDocument()
  })

  it("calls onKeyChange when key input changes", () => {
    const props = createDefaultProps()

    render(<SpecFormRow {...props} />, {
      wrapper: TestingProvider,
    })

    const keyInput = screen.getByDisplayValue("testKey")
    fireEvent.change(keyInput, { target: { value: "newKey" } })

    expect(props.onKeyChange).toHaveBeenCalledWith("newKey")
    expect(props.onKeyChange).toHaveBeenCalledTimes(1)
  })

  it("calls onValueChange when value input changes", () => {
    const props = createDefaultProps()

    render(<SpecFormRow {...props} />, {
      wrapper: TestingProvider,
    })

    const valueInput = screen.getByDisplayValue("testValue")
    fireEvent.change(valueInput, { target: { value: "newValue" } })

    expect(props.onValueChange).toHaveBeenCalledWith("newValue")
    expect(props.onValueChange).toHaveBeenCalledTimes(1)
  })

  it("verifies button mapping - primary should be save, non-primary should be cancel", () => {
    const props = createDefaultProps()

    const { container } = render(<SpecFormRow {...props} />, {
      wrapper: TestingProvider,
    })

    const buttons = container.querySelectorAll("button")
    const primaryButton = Array.from(buttons).find((btn) => btn.classList.contains("juno-button-primary"))
    const nonPrimaryButton = Array.from(buttons).find((btn) => !btn.classList.contains("juno-button-primary"))

    expect(primaryButton).toBeTruthy()
    expect(nonPrimaryButton).toBeTruthy()
    expect(primaryButton?.getAttribute("title")).toBe("Save Metadata")
    expect(nonPrimaryButton?.getAttribute("title")).toBe("Cancel")
  })

  it("calls onSave when save button is clicked", () => {
    const props = createDefaultProps()

    const { container } = render(<SpecFormRow {...props} />, {
      wrapper: TestingProvider,
    })

    const buttons = container.querySelectorAll("button")
    const saveButton = Array.from(buttons).find((btn) => btn.getAttribute("title") === "Save Metadata")

    expect(saveButton).toBeTruthy()
    fireEvent.click(saveButton!)
    expect(props.onSave).toHaveBeenCalledTimes(1)
  })

  it("calls onCancel when cancel button is clicked", () => {
    const props = createDefaultProps()

    const { container } = render(<SpecFormRow {...props} />, {
      wrapper: TestingProvider,
    })

    const buttons = container.querySelectorAll("button")
    const cancelButton = Array.from(buttons).find((btn) => btn.getAttribute("title") === "Cancel")

    expect(cancelButton).toBeTruthy()
    fireEvent.click(cancelButton!)
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  it("disables buttons when loading", () => {
    const props = {
      ...createDefaultProps(),
      isLoading: true,
    }

    const { container } = render(<SpecFormRow {...props} />, {
      wrapper: TestingProvider,
    })

    const buttons = container.querySelectorAll("button")
    const saveButton = Array.from(buttons).find((btn) => btn.getAttribute("title") === "Save Metadata")
    const cancelButton = Array.from(buttons).find((btn) => btn.getAttribute("title") === "Cancel")

    expect(saveButton).toBeDisabled()
    expect(cancelButton).toBeDisabled()
  })

  it("enables buttons when not loading", () => {
    const props = createDefaultProps()

    const { container } = render(<SpecFormRow {...props} />, {
      wrapper: TestingProvider,
    })

    const buttons = container.querySelectorAll("button")
    const saveButton = Array.from(buttons).find((btn) => btn.getAttribute("title") === "Save Metadata")
    const cancelButton = Array.from(buttons).find((btn) => btn.getAttribute("title") === "Cancel")

    expect(saveButton).toBeEnabled()
    expect(cancelButton).toBeEnabled()
  })
})
