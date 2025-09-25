import { render, screen, act } from "@testing-library/react"
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

    const keyInput = screen.getByPlaceholderText("Enter key")
    const valueInput = screen.getByPlaceholderText("Enter value")
    expect(keyInput).toHaveValue("")
    expect(valueInput).toHaveValue("")
  })
})
