import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll } from "vitest"
import { SpecRow } from "./SpecRow"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("SpecRow", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  it("renders spec data correctly", async () => {
    await act(async () => {
      render(<SpecRow specKey="cpu" value="dedicated" isDeleting={false} onDelete={vi.fn()} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.getByText("cpu")).toBeInTheDocument()
    expect(screen.getByText("dedicated")).toBeInTheDocument()

    expect(screen.getByTestId("delete-cpu")).toBeInTheDocument()
  })

  it("shows spinner when deleting", async () => {
    await act(async () => {
      render(<SpecRow specKey="cpu" value="dedicated" isDeleting={true} onDelete={vi.fn()} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.queryByTestId("delete-cpu")).not.toBeInTheDocument()
  })

  it("calls onDelete when delete button is clicked", async () => {
    const onDelete = vi.fn()

    await act(async () => {
      render(<SpecRow specKey="cpu" value="dedicated" isDeleting={false} onDelete={onDelete} />, {
        wrapper: TestingProvider,
      })
    })

    const deleteButton = screen.getByTestId("delete-cpu")

    await act(async () => {
      fireEvent.click(deleteButton)
    })

    expect(onDelete).toHaveBeenCalled()
  })

  it("has correct accessibility attributes", async () => {
    await act(async () => {
      render(<SpecRow specKey="cpu" value="dedicated" isDeleting={false} onDelete={vi.fn()} />, {
        wrapper: TestingProvider,
      })
    })

    const deleteButton = screen.getByRole("button", { name: /delete cpu/i })
    expect(deleteButton).toHaveAttribute("title", "Delete cpu")
    expect(deleteButton).toHaveAttribute("aria-label", "Delete cpu")
  })

  it("handles different spec keys correctly", async () => {
    await act(async () => {
      render(<SpecRow specKey="hw:mem_page_size" value="large" isDeleting={false} onDelete={vi.fn()} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.getByText("hw:mem_page_size")).toBeInTheDocument()
    expect(screen.getByText("large")).toBeInTheDocument()
    expect(screen.getByTestId("delete-hw:mem_page_size")).toBeInTheDocument()
  })
})
