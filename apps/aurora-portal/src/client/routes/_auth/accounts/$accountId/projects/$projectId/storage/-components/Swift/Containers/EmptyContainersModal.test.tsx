import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { EmptyContainersModal } from "./EmptyContainersModal"
import type { ContainerSummary } from "@/server/Storage/types/swift"

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const mockReset = vi.fn()
const mockInvalidate = vi.fn()

// Controls how mutateAsync behaves per container name:
// null = always succeed with 3 deleted, string = error message for all
let mutationError: string | null = null
let mutationDeletedCount = 3

const mockMutateAsync = vi.fn().mockImplementation(async () => {
  if (mutationError) throw new Error(mutationError)
  return mutationDeletedCount
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        swift: {
          listContainers: { invalidate: mockInvalidate },
        },
      },
    }),
    storage: {
      swift: {
        emptyContainer: {
          useMutation: () => ({
            mutateAsync: mockMutateAsync,
            reset: mockReset,
            isPending: false,
          }),
        },
      },
    },
  },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeContainer = (name: string, overrides: Partial<ContainerSummary> = {}): ContainerSummary => ({
  name,
  count: 5,
  bytes: 1048576,
  last_modified: "2024-01-15T10:30:00.000000",
  ...overrides,
})

const mockContainers: ContainerSummary[] = [makeContainer("alpha"), makeContainer("beta"), makeContainer("gamma")]

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({
  isOpen = true,
  containers = mockContainers,
  onClose = vi.fn(),
  onComplete = vi.fn(),
}: {
  isOpen?: boolean
  containers?: ContainerSummary[]
  onClose?: () => void
  onComplete?: (result: { emptiedCount: number; totalDeleted: number; errors: string[] }) => void
} = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <EmptyContainersModal isOpen={isOpen} containers={containers} onClose={onClose} onComplete={onComplete} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EmptyContainersModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mutationError = null
    mutationDeletedCount = 3
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Visibility", () => {
    test("does not render when isOpen is false", () => {
      renderModal({ isOpen: false })
      expect(screen.queryByText(/Empty Containers/i)).not.toBeInTheDocument()
    })

    test("does not render when containers array is empty", () => {
      renderModal({ containers: [] })
      expect(screen.queryByText(/Empty Containers/i)).not.toBeInTheDocument()
    })

    test("renders when isOpen is true and containers are provided", () => {
      renderModal()
      expect(screen.getByText("Empty Containers")).toBeInTheDocument()
    })

    test("renders with a single container", () => {
      renderModal({ containers: [makeContainer("single")] })
      expect(screen.getByText("Empty Containers")).toBeInTheDocument()
      expect(screen.getByText("single")).toBeInTheDocument()
    })
  })

  describe("Content", () => {
    test("renders warning message", () => {
      renderModal()
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument()
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
    })

    test("renders large objects notice", () => {
      renderModal()
      expect(screen.getByText(/dynamic/i)).toBeInTheDocument()
      expect(screen.getByText(/static large objects/i)).toBeInTheDocument()
    })

    test("renders containers to be emptied heading with count", () => {
      renderModal()
      expect(screen.getByText(/Containers to be emptied \(3\)/i)).toBeInTheDocument()
    })

    test("renders all container names in the list", () => {
      renderModal()
      expect(screen.getByText("alpha")).toBeInTheDocument()
      expect(screen.getByText("beta")).toBeInTheDocument()
      expect(screen.getByText("gamma")).toBeInTheDocument()
    })

    test("renders Empty and Cancel buttons", () => {
      renderModal()
      expect(screen.getByRole("button", { name: /^Empty$/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument()
    })

    test("container list has scrollable container", () => {
      renderModal()
      const list = screen.getByText("alpha").closest(".overflow-y-auto")
      expect(list).toBeInTheDocument()
      expect(list).toHaveClass("max-h-48")
    })
  })

  describe("Truncation (> 20 containers)", () => {
    test("shows only 20 container names when more than 20 are provided", () => {
      const manyContainers = Array.from({ length: 25 }, (_, i) => makeContainer(`container-${i}`))
      renderModal({ containers: manyContainers })
      // First 20 are visible
      expect(screen.getByText("container-0")).toBeInTheDocument()
      expect(screen.getByText("container-19")).toBeInTheDocument()
      // 21st onward is hidden
      expect(screen.queryByText("container-20")).not.toBeInTheDocument()
    })

    test("shows '... and N more' note when list is truncated", () => {
      const manyContainers = Array.from({ length: 25 }, (_, i) => makeContainer(`container-${i}`))
      renderModal({ containers: manyContainers })
      expect(screen.getByText(/... and 5 more/i)).toBeInTheDocument()
    })

    test("does not show overflow note when 20 or fewer containers", () => {
      const exactContainers = Array.from({ length: 20 }, (_, i) => makeContainer(`container-${i}`))
      renderModal({ containers: exactContainers })
      expect(screen.queryByText(/... and \d+ more/i)).not.toBeInTheDocument()
    })
  })

  describe("Confirmation", () => {
    test("calls mutateAsync for each selected container on confirm", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Empty$/i }))
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledTimes(3)
        expect(mockMutateAsync).toHaveBeenCalledWith({ container: "alpha" })
        expect(mockMutateAsync).toHaveBeenCalledWith({ container: "beta" })
        expect(mockMutateAsync).toHaveBeenCalledWith({ container: "gamma" })
      })
    })

    test("calls listContainers.invalidate after all containers are emptied", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Empty$/i }))
      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled()
      })
    })

    test("calls onComplete with correct emptied count and total deleted objects", async () => {
      mutationDeletedCount = 5
      const onComplete = vi.fn()
      const user = userEvent.setup()
      renderModal({ onComplete })
      await user.click(screen.getByRole("button", { name: /^Empty$/i }))
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({ emptiedCount: 3, totalDeleted: 15, errors: [] })
      })
    })

    test("calls onClose after successful confirmation", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /^Empty$/i }))
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    test("calls onComplete with totalDeleted 0 when all containers return 0 objects", async () => {
      mutationDeletedCount = 0
      const onComplete = vi.fn()
      const user = userEvent.setup()
      renderModal({ onComplete })
      await user.click(screen.getByRole("button", { name: /^Empty$/i }))
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledWith({ emptiedCount: 3, totalDeleted: 0, errors: [] })
      })
    })
  })

  describe("Error handling", () => {
    test("calls onComplete with errors when mutation fails", async () => {
      mutationError = "Bulk delete failed"
      const onComplete = vi.fn()
      const user = userEvent.setup()
      renderModal({ onComplete })
      await user.click(screen.getByRole("button", { name: /^Empty$/i }))
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1)
        const result = onComplete.mock.calls[0][0]
        expect(result.errors).toContain("alpha: Bulk delete failed")
        expect(result.errors).toContain("beta: Bulk delete failed")
        expect(result.errors).toContain("gamma: Bulk delete failed")
        expect(result.emptiedCount).toBe(0)
      })
    })

    test("calls onComplete with partial results in partial-success case", async () => {
      let callCount = 0
      mockMutateAsync.mockImplementation(async () => {
        callCount++
        if (callCount === 1) return 4
        throw new Error("Server error")
      })
      const onComplete = vi.fn()
      const user = userEvent.setup()
      renderModal({ onComplete })
      await user.click(screen.getByRole("button", { name: /^Empty$/i }))
      await waitFor(() => {
        const result = onComplete.mock.calls[0][0]
        expect(result.emptiedCount).toBe(1)
        expect(result.totalDeleted).toBe(4)
        expect(result.errors.length).toBe(2)
      })
    })

    test("calls onClose after error", async () => {
      mutationError = "Server error"
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /^Empty$/i }))
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    test("invalidates listContainers even when mutation fails", async () => {
      mutationError = "Server error"
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /^Empty$/i }))
      await waitFor(() => {
        expect(mockInvalidate).toHaveBeenCalled()
      })
    })
  })

  describe("Cancel / close", () => {
    test("calls onClose when Cancel button is clicked", async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderModal({ onClose })
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(onClose).toHaveBeenCalled()
    })

    test("calls mutation.reset when modal is closed", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(mockReset).toHaveBeenCalled()
    })

    test("does not call mutateAsync when Cancel is clicked", async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole("button", { name: /Cancel/i }))
      expect(mockMutateAsync).not.toHaveBeenCalled()
    })
  })
})
