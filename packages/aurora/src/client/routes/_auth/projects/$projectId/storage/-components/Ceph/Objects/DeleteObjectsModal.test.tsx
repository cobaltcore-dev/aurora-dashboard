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
const mockVersionsMutate = vi.fn()
const mockReset = vi.fn()
const mockVersionsReset = vi.fn()
const mockInvalidate = vi.fn()

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    storage: {
      ceph: {
        objects: {
          deleteBulk: {
            useMutation: vi.fn(),
          },
          deleteVersionsBulk: {
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
          versioning: {
            checkDeletedContent: {
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

    // Default mock implementation for object deletion
    vi.mocked(trpcReact.storage.ceph.objects.deleteBulk.useMutation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      error: null,
      reset: mockReset,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    // Default mock implementation for version deletion
    vi.mocked(trpcReact.storage.ceph.objects.deleteVersionsBulk.useMutation).mockReturnValue({
      mutate: mockVersionsMutate,
      isPending: false,
      error: null,
      reset: mockVersionsReset,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it("renders with correct title for multiple objects", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt", "file2.txt", "file3.txt"]}
          versions={[]}
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
          versions={[]}
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
          versions={[]}
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
          versions={[]}
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
          versions={[]}
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

    const input = screen.getByLabelText(/Type "delete" to confirm/i)
    await user.type(input, "delete")

    expect(confirmButton).not.toBeDisabled()
  })

  it("calls mutate with correct payload on confirm", async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt", "file2.txt"]}
          versions={[]}
          currentPrefix=""
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    const input = screen.getByLabelText(/Type "delete" to confirm/i)
    await user.type(input, "delete")

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
          versions={[]}
          currentPrefix=""
          isOpen={true}
          onClose={onClose}
          onDeleted={onDeleted}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    const confirmInput = screen.getByLabelText(/Type "delete" to confirm/i)
    await user.type(confirmInput, "delete")

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
          versions={[]}
          currentPrefix=""
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={onDeleted}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    const confirmInput = screen.getByLabelText(/Type "delete" to confirm/i)
    await user.type(confirmInput, "delete")

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
          versions={[]}
          currentPrefix=""
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={onError}
        />
      </TestWrapper>
    )

    const confirmInput = screen.getByLabelText(/Type "delete" to confirm/i)
    await user.type(confirmInput, "delete")

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
          versions={[]}
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
      screen.getByText(/The selected objects will be marked as deleted but can be restored from version history/)
    ).toBeInTheDocument()
  })

  it("returns null when not open", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={["file1.txt"]}
          versions={[]}
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
          versions={[]}
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

  // ============================================================================
  // VERSION MODE TESTS
  // ============================================================================

  it("renders with correct title for multiple versions in version mode", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={[]}
          versions={[
            { key: "file1.txt", versionId: "v1" },
            { key: "file2.txt", versionId: "v2" },
            { key: "file3.txt", versionId: "v3" },
          ]}
          currentPrefix=""
          isVersionMode={true}
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    expect(screen.getByText("Delete 3 Versions")).toBeInTheDocument()
  })

  it("renders with correct title for one version in version mode", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={[]}
          versions={[{ key: "file1.txt", versionId: "v1" }]}
          currentPrefix=""
          isVersionMode={true}
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    expect(screen.getByText("Delete 1 Version")).toBeInTheDocument()
  })

  it("requires 'delete' confirmation text in version mode", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={[]}
          versions={[{ key: "file1.txt", versionId: "v1" }]}
          currentPrefix=""
          isVersionMode={true}
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    const deleteButton = screen.getByRole("button", { name: /Delete/i })
    expect(deleteButton).toBeDisabled()

    const input = screen.getByPlaceholderText("delete")
    expect(input).toBeInTheDocument()
  })

  it("shows permanent deletion warning in version mode", () => {
    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={[]}
          versions={[{ key: "file1.txt", versionId: "v1" }]}
          currentPrefix=""
          isVersionMode={true}
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    expect(screen.getByText(/These versions will be permanently deleted and cannot be restored/)).toBeInTheDocument()
  })

  it("calls deleteVersionsBulk mutation in version mode", async () => {
    const user = userEvent.setup()
    const onDeleted = vi.fn()
    const onClose = vi.fn()

    // Mock successful deletion
    vi.mocked(trpcReact.storage.ceph.objects.deleteVersionsBulk.useMutation).mockImplementation((options) => {
      return {
        mutate: vi.fn((input) => {
          // Immediately invoke onSuccess with mock result
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(options?.onSuccess as any)?.(
            {
              deleted: [
                { key: "file1.txt", versionId: "v1" },
                { key: "file2.txt", versionId: "v2" },
              ],
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
        reset: mockVersionsReset,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    })

    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={[]}
          versions={[
            { key: "file1.txt", versionId: "v1" },
            { key: "file2.txt", versionId: "v2" },
          ]}
          currentPrefix=""
          isVersionMode={true}
          isOpen={true}
          onClose={onClose}
          onDeleted={onDeleted}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText("delete")
    await act(async () => {
      await user.type(input, "delete")
    })

    const deleteButton = screen.getByRole("button", { name: /Delete/i })
    await act(async () => {
      await user.click(deleteButton)
    })

    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledWith(["file1.txt", "file2.txt"], 0)
    })
  })

  it("does NOT call deleteBulk mutation in version mode", async () => {
    const user = userEvent.setup()

    // Mock successful deletion
    vi.mocked(trpcReact.storage.ceph.objects.deleteVersionsBulk.useMutation).mockImplementation((options) => {
      return {
        mutate: vi.fn((input) => {
          // Immediately invoke onSuccess with mock result
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(options?.onSuccess as any)?.(
            {
              deleted: [{ key: "file1.txt", versionId: "v1" }],
              errors: [],
              deletedCount: 1,
              errorCount: 0,
            },
            input,
            undefined
          )
        }),
        isPending: false,
        error: null,
        reset: mockVersionsReset,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any
    })

    render(
      <TestWrapper>
        <DeleteObjectsModal
          bucketName="test-bucket"
          objectKeys={[]}
          versions={[{ key: "file1.txt", versionId: "v1" }]}
          currentPrefix=""
          isVersionMode={true}
          isOpen={true}
          onClose={vi.fn()}
          onDeleted={vi.fn()}
          onError={vi.fn()}
        />
      </TestWrapper>
    )

    const input = screen.getByPlaceholderText("delete")
    await act(async () => {
      await user.type(input, "delete")
    })

    const deleteButton = screen.getByRole("button", { name: /Delete/i })
    await act(async () => {
      await user.click(deleteButton)
    })

    await waitFor(() => {
      // Verify version deletion was called (happens in mockImplementation)
      expect(screen.queryByText(/Deleting.../i)).not.toBeInTheDocument()
    })

    // Verify object deletion was NOT called
    expect(mockMutate).not.toHaveBeenCalled()
  })
})
