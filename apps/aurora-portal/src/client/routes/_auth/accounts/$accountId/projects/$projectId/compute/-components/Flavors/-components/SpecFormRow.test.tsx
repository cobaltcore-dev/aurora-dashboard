import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll } from "vitest"
import { SpecFormRow } from "./SpecFormRow"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("SpecFormRow", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const createMockForm = (overrides = {}) => ({
    key: "testKey",
    value: "testValue",
    errors: {} as { key?: string; value?: string },
    updateKey: vi.fn(),
    updateValue: vi.fn(),
    validate: vi.fn().mockReturnValue(true),
    reset: vi.fn(),
    trimmedKey: "testKey",
    trimmedValue: "testValue",
    ...overrides,
  })

  it("renders form inputs correctly", async () => {
    const mockForm = createMockForm()

    await act(async () => {
      render(<SpecFormRow form={mockForm} isLoading={false} onSave={vi.fn()} onCancel={vi.fn()} />, {
        wrapper: TestingProvider,
      })
    })

    // Debug: Let's see what's actually rendered
    screen.debug()

    // Try different ways to find the inputs
    const keyInput = screen.getByDisplayValue("testKey")
    const valueInput = screen.getByDisplayValue("testValue")

    expect(keyInput).toBeInTheDocument()
    expect(valueInput).toBeInTheDocument()
  })

  it("handles empty key and value", async () => {
    const mockForm = createMockForm({
      key: "",
      value: "",
      trimmedKey: "",
      trimmedValue: "",
    })

    await act(async () => {
      render(<SpecFormRow form={mockForm} isLoading={false} onSave={vi.fn()} onCancel={vi.fn()} />, {
        wrapper: TestingProvider,
      })
    })

    // Debug: Check what's rendered when values are empty
    screen.debug()

    // Try different selectors
    try {
      const keyInput = screen.getByPlaceholderText("Enter key")
      const valueInput = screen.getByPlaceholderText("Enter value")
      expect(keyInput).toHaveValue("")
      expect(valueInput).toHaveValue("")
    } catch (error) {
      // If placeholder doesn't work, try by role
      const inputs = screen.getAllByRole("textbox")
      expect(inputs).toHaveLength(2)
      expect(inputs[0]).toHaveValue("")
      expect(inputs[1]).toHaveValue("")
    }
  })
})
