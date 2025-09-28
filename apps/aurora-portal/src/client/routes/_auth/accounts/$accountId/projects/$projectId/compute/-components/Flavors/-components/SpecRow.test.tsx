import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest"
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

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
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

  it("shows confirmation button when delete button is clicked", async () => {
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

    expect(screen.queryByTestId("delete-cpu")).not.toBeInTheDocument()

    expect(screen.getByTestId("confirm-deletion")).toBeInTheDocument()
    expect(screen.getByText("Delete")).toBeInTheDocument()

    expect(onDelete).not.toHaveBeenCalled()
  })

  it("calls onDelete when confirmation button is clicked", async () => {
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

    const confirmButton = screen.getByTestId("confirm-deletion")
    await act(async () => {
      fireEvent.click(confirmButton)
    })

    expect(onDelete).toHaveBeenCalledTimes(1)

    expect(screen.queryByTestId("confirm-deletion")).not.toBeInTheDocument()
    expect(screen.getByTestId("delete-cpu")).toBeInTheDocument()
  })

  it("reverts to delete button after 3 seconds without confirmation", async () => {
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

    expect(screen.getByTestId("confirm-deletion")).toBeInTheDocument()
    expect(screen.queryByTestId("delete-cpu")).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByTestId("confirm-deletion")).not.toBeInTheDocument()
    expect(screen.getByTestId("delete-cpu")).toBeInTheDocument()

    expect(onDelete).not.toHaveBeenCalled()
  })

  it("does not revert if confirmation is clicked before 3 seconds", async () => {
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

    await act(async () => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByTestId("confirm-deletion")).toBeInTheDocument()

    const confirmButton = screen.getByTestId("confirm-deletion")
    await act(async () => {
      fireEvent.click(confirmButton)
    })

    expect(onDelete).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByTestId("delete-cpu")).toBeInTheDocument()
  })

  it("has correct accessibility attributes for delete button", async () => {
    await act(async () => {
      render(<SpecRow specKey="cpu" value="dedicated" isDeleting={false} onDelete={vi.fn()} />, {
        wrapper: TestingProvider,
      })
    })

    const deleteButton = screen.getByRole("button", { name: /delete cpu/i })
    expect(deleteButton).toHaveAttribute("title", "Delete cpu")
    expect(deleteButton).toHaveAttribute("aria-label", "Delete cpu")
  })

  it("has correct accessibility attributes for confirmation button", async () => {
    await act(async () => {
      render(<SpecRow specKey="cpu" value="dedicated" isDeleting={false} onDelete={vi.fn()} />, {
        wrapper: TestingProvider,
      })
    })

    const deleteButton = screen.getByTestId("delete-cpu")
    await act(async () => {
      fireEvent.click(deleteButton)
    })

    const confirmButton = screen.getByRole("button", { name: /Delete/i })
    expect(confirmButton).toHaveAttribute("title", "Delete")
    expect(confirmButton).toHaveAttribute("aria-label", "Delete")
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

  it("disables buttons when isDeleting is true", async () => {
    await act(async () => {
      render(<SpecRow specKey="cpu" value="dedicated" isDeleting={true} onDelete={vi.fn()} />, {
        wrapper: TestingProvider,
      })
    })

    expect(screen.queryByTestId("delete-cpu")).not.toBeInTheDocument()
    expect(screen.queryByTestId("confirm-deletion")).not.toBeInTheDocument()
  })

  it("disables confirmation button when isDeleting becomes true", async () => {
    const onDelete = vi.fn()

    const { rerender } = render(
      <TestingProvider>
        <SpecRow specKey="cpu" value="dedicated" isDeleting={false} onDelete={onDelete} />
      </TestingProvider>
    )

    const deleteButton = screen.getByTestId("delete-cpu")
    await act(async () => {
      fireEvent.click(deleteButton)
    })

    expect(screen.getByTestId("confirm-deletion")).toBeInTheDocument()

    await act(async () => {
      rerender(
        <TestingProvider>
          <SpecRow specKey="cpu" value="dedicated" isDeleting={true} onDelete={onDelete} />
        </TestingProvider>
      )
    })

    expect(screen.queryByTestId("confirm-deletion")).not.toBeInTheDocument()
    expect(screen.queryByTestId("delete-cpu")).not.toBeInTheDocument()
  })
})
