import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { DeleteObjectsModal } from "./DeleteObjectsModal"
import { trpcReact } from "@/client/trpcClient"

// Mock useProjectId
vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: vi.fn(() => "test-project-id"),
}))

// Mock useModalTracking
vi.mock("@/client/hooks/useModalTracking", () => ({
  useModalTracking: vi.fn(() => ({
    trackClose: vi.fn(),
    markSubmitted: vi.fn(),
    resetTracking: vi.fn(),
  })),
}))

// Mock tRPC
const mockMutate = vi.fn()
const mockReset = vi.fn()
const mockInvalidate = vi.fn()

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        objects: {
          deleteBulk: {
            useMutation: vi.fn(),
          },
        },
      },
    },
    useUtils: vi.fn(() => ({
      storage: {
        ceph: {
          objects: {
            list: {
              invalidate: mockInvalidate,
            },
          },
          containers: {
            list: {
              invalidate: mockInvalidate,
            },
          },
        },
      },
    })),
  },
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <I18nProvider i18n={i18n}>
      <PortalProvider>{children}</PortalProvider>
    </I18nProvider>
  )
}

describe("DeleteObjectsModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await act(async () => {
      i18n.activate("en")
    })

    // Default mock implementation
    vi.mocked(trpcReact.storage.ceph.objects.deleteBulk.useMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
      reset: mockReset,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it("renders with correct title for multiple objects", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt", "file2.txt", "file3.txt"]}
          currentPrefix=""
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    expect(screen.getByText("Delete 3 Objects")).toBeInTheDocument()
  })

  it("renders with correct title for one object", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt"]}
          currentPrefix=""
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    expect(screen.getByText("Delete 1 Object")).toBeInTheDocument()
  })

  it("lists display names of objects to delete", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["prefix/file1.txt", "prefix/file2.txt"]}
          currentPrefix="prefix/"
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    expect(screen.getByText("file1.txt")).toBeInTheDocument()
    expect(screen.getByText("file2.txt")).toBeInTheDocument()
  })

  it("truncates list past 20 items", () => {
    const keys = Array.from({ length: 25 }, (_, i) => `file-${i}.txt`)

    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={keys}
          currentPrefix=""
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    expect(screen.getByText("file-0.txt")).toBeInTheDocument()
    expect(screen.getByText("file-19.txt")).toBeInTheDocument()
    expect(screen.getByText("… and 5 more")).toBeInTheDocument()
    expect(screen.queryByText("file-20.txt")).not.toBeInTheDocument()
  })

  it("disables confirm button until DELETE is typed", async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt"]}
          currentPrefix=""
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    const confirmButton = screen.getByRole("button", { name: /Delete/i })
    expect(confirmButton).toBeDisabled()

    const input = screen.getByLabelText(/Type DELETE to confirm/i)
    await user.type(input, "DELETE")

    expect(confirmButton).not.toBeDisabled()
  })

  it("calls mutate with correct payload on confirm", async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt", "file2.txt"]}
          currentPrefix=""
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    const input = screen.getByLabelText(/Type DELETE to confirm/i)
    await user.type(input, "DELETE")

    const confirmButton = screen.getByRole("button", { name: /Delete/i })
    await user.click(confirmButton)

    expect(mockMutate).toHaveBeenCalledWith({
      project_id: "test-project-id",
      containerName: "test-bucket",
      objectKeys: ["file1.txt", "file2.txt"],
    })
  })

  it("closes modal and calls onDeleted on full success", async () => {
    const onDeleted = vi.fn()
    const onClose = vi.fn()
    const user = userEvent.setup()

    // Mock useMutation to capture and immediately invoke success callback
    vi.mocked(trpcReact.storage.ceph.objects.deleteBulk.useMutation).mockImplementation((options) => {
      return {
        mutate: vi.fn((input) => {
          // Immediately invoke onSuccess with mock result
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(options?.onSuccess as any)?.(
            {
              deleted: [{ key: "file1.txt" }, { key: "file2.txt" }],
              errors: [],
              deletedCount: 2,
              errorCount: 0,
            },
            input,
            undefined
          )
        }),
        isPending: false,
        error: null,
        reset: mockReset,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    })

    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt", "file2.txt"]}
          currentPrefix=""
          isOpen={true}
          onClose={onClose}
          onDeleted={onDeleted}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    const confirmInput = screen.getByLabelText(/Type DELETE to confirm/i)
    await user.type(confirmInput, "DELETE")

    const confirmButton = screen.getByRole("button", { name: /Delete/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith(["file1.txt", "file2.txt"], 0)
      expect(onClose).toHaveBeenCalled()
    })
  })

  it("shows results summary on partial failure", async () => {
    const onDeleted = vi.fn()
    const user = userEvent.setup()

    // Mock useMutation to return partial failure
    vi.mocked(trpcReact.storage.ceph.objects.deleteBulk.useMutation).mockImplementation((options) => {
      return {
        mutate: vi.fn((input) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(options?.onSuccess as any)?.(
            {
              deleted: [{ key: "file1.txt" }],
              errors: [{ key: "file2.txt", code: "AccessDenied", message: "Access Denied" }],
              deletedCount: 1,
              errorCount: 1,
            },
            input,
            undefined
          )
        }),
        isPending: false,
        error: null,
        reset: mockReset,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    })

    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt", "file2.txt"]}
          currentPrefix=""
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={onDeleted}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    const confirmInput = screen.getByLabelText(/Type DELETE to confirm/i)
    await user.type(confirmInput, "DELETE")

    const confirmButton = screen.getByRole("button", { name: /Delete/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(screen.getByText("Delete Results")).toBeInTheDocument()
      expect(screen.getByText("1 deleted, 1 failed.")).toBeInTheDocument()
      expect(screen.getByText("file2.txt")).toBeInTheDocument()
      expect(screen.getByText("AccessDenied: Access Denied")).toBeInTheDocument()
      expect(onDeleted).toHaveBeenCalledWith(["file1.txt"], 1)
    })
  })

  it("calls onError on tRPC error", async () => {
    const onError = vi.fn()
    const user = userEvent.setup()

    // Mock useMutation to invoke error callback
    vi.mocked(trpcReact.storage.ceph.objects.deleteBulk.useMutation).mockImplementation((options) => {
      return {
        mutate: vi.fn(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(options?.onError as any)?.({ message: "Bucket not found" }, null, undefined)
        }),
        isPending: false,
        error: null,
        reset: mockReset,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    })

    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt"]}
          currentPrefix=""
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={onError}
        />
      </TestWrapper>
    )

    const confirmInput = screen.getByLabelText(/Type DELETE to confirm/i)
    await user.type(confirmInput, "DELETE")

    const confirmButton = screen.getByRole("button", { name: /Delete/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Bucket not found")
    })
  })

  it("shows versioning-aware message", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt"]}
          currentPrefix=""
          versioningEnabled={true}
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    expect(
      screen.getByText(/The selected objects will be marked as deleted and can be restored from version history/)
    ).toBeInTheDocument()
  })

  it("returns null when not open", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt"]}
          currentPrefix=""
          isOpen={false}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    // Modal should not be visible when not open
    expect(screen.queryByText(/Delete.*Object/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("returns null when objectKeys is empty", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={[]}
          currentPrefix=""
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    // Modal should not render when objectKeys is empty
    expect(screen.queryByText(/Delete.*Object/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})
