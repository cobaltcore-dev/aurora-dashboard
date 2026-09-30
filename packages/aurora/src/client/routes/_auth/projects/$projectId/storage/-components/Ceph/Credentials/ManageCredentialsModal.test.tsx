import { describe, test, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider, toast } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ManageCredentialsModal } from "./ManageCredentialsModal"

// ─── Mock the Juno toast API ──────────────────────────────────────────────────

vi.mock("@cloudoperators/juno-ui-components", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cloudoperators/juno-ui-components")>()
  return {
    ...actual,
    toast: Object.assign(actual.toast, { success: vi.fn(), error: vi.fn() }),
  }
})

// ─── Mock useProjectId ────────────────────────────────────────────────────────

const mockProjectId = "test-project-123"

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => mockProjectId,
}))

// ─── useRouteContext mock (for useModalTracking) ──────────────────────────────

const mockOnTrackEvent = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useRouteContext: () => ({ onTrackEvent: mockOnTrackEvent }),
}))

// ─── Mock useCephPermissions ───────────────────────────────────────────────────

let mockPermissions = { canCreateCredential: true, canDeleteCredential: true }
let mockPermissionsError = false

vi.mock("../hooks/useCephPermissions", () => ({
  useCephPermissions: () => ({ permissions: mockPermissions, isLoading: false, isError: mockPermissionsError }),
}))

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const TEST_CREDENTIAL_ID = "cred-1"
const TEST_ACCESS = "AKIAEXAMPLE0000000001"
const TEST_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

type Credential = { id: string; access: string; user_id: string; project_id: string }
type CredentialWithSecret = Credential & { secret: string }

const {
  mockInvalidateList,
  mockInvalidateContainersList,
  mockInvalidateStatus,
  mockRevealMutateAsync,
  mockRevealReset,
  mockCreateMutate,
  mockCreateReset,
  mockDeleteMutate,
  mockDeleteReset,
  mockState,
} = vi.hoisted(() => {
  const mockState = {
    credentials: [] as Credential[],
    isLoadingCredentials: false,
    listError: null as { message: string } | null,
    status: { hasCredentials: true, endpoint: "https://s3.example.com", region: "eu-de-1" } as
      { hasCredentials: boolean; endpoint: string; region: string } | undefined,
    statusError: null as { message: string } | null,
    revealResult: null as CredentialWithSecret | null,
    revealError: null as Error | null,
    isRevealPending: false,
    createResult: null as CredentialWithSecret | null,
    createError: null as string | null,
    isCreatePending: false,
    isDeletePending: false,
    deleteError: null as string | null,
    createOptions: {} as {
      onSuccess?: (cred: CredentialWithSecret) => void
      onError?: (err: { message: string }) => void
    },
    deleteOptions: {} as { onSuccess?: () => void; onError?: (err: { message: string }) => void },
  }

  const mockInvalidateList = vi.fn()
  const mockInvalidateContainersList = vi.fn()
  const mockInvalidateStatus = vi.fn()

  const mockRevealReset = vi.fn()
  const mockRevealMutateAsync = vi.fn().mockImplementation(async () => {
    if (mockState.revealError) throw mockState.revealError
    return mockState.revealResult
  })

  const mockCreateReset = vi.fn()
  const mockCreateMutate = vi.fn().mockImplementation(() => {
    if (mockState.createError) {
      mockState.createOptions.onError?.({ message: mockState.createError })
    } else if (mockState.createResult) {
      // Simulate the list query being refetched (via the real onSuccess's invalidate calls)
      // by having the new credential show up in the next render's `credentials`.
      mockState.credentials = [...mockState.credentials, mockState.createResult]
      mockState.createOptions.onSuccess?.(mockState.createResult)
    }
  })

  const mockDeleteReset = vi.fn()
  const mockDeleteMutate = vi.fn().mockImplementation(({ credentialId }: { credentialId: string }) => {
    if (mockState.deleteError) {
      mockState.deleteOptions.onError?.({ message: mockState.deleteError })
    } else {
      // Simulate the list query being refetched (via the real onSuccess's invalidate call) by
      // dropping the deleted credential, the same way the create mock appends the new one.
      mockState.credentials = mockState.credentials.filter((credential) => credential.id !== credentialId)
      mockState.deleteOptions.onSuccess?.()
    }
  })

  return {
    mockInvalidateList,
    mockInvalidateContainersList,
    mockInvalidateStatus,
    mockRevealMutateAsync,
    mockRevealReset,
    mockCreateMutate,
    mockCreateReset,
    mockDeleteMutate,
    mockDeleteReset,
    mockState,
  }
})

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: () => ({
      storage: {
        ceph: {
          ec2Credentials: {
            list: {
              invalidate: mockInvalidateList,
              // The helper decides from the post-refetch cache, not from the component's copy.
              // The mutation mocks below keep `mockState.credentials` in step, so reading it here
              // is what a settled refetch would have left behind.
              getData: () => mockState.credentials,
            },
          },
          containers: {
            list: { invalidate: mockInvalidateContainersList },
            status: { invalidate: mockInvalidateStatus },
          },
        },
      },
    }),
    storage: {
      ceph: {
        ec2Credentials: {
          list: {
            useQuery: () => ({
              data: mockState.credentials,
              isLoading: mockState.isLoadingCredentials,
              error: mockState.listError,
            }),
          },
          reveal: {
            useMutation: () => ({
              mutateAsync: mockRevealMutateAsync,
              isPending: mockState.isRevealPending,
              reset: mockRevealReset,
            }),
          },
          create: {
            useMutation: (options: typeof mockState.createOptions) => {
              mockState.createOptions = options ?? {}
              return { mutate: mockCreateMutate, isPending: mockState.isCreatePending, reset: mockCreateReset }
            },
          },
          delete: {
            useMutation: (options: typeof mockState.deleteOptions) => {
              mockState.deleteOptions = options ?? {}
              return { mutate: mockDeleteMutate, isPending: mockState.isDeletePending, reset: mockDeleteReset }
            },
          },
        },
        containers: {
          status: {
            useQuery: () => ({ data: mockState.status, error: mockState.statusError }),
          },
        },
      },
    },
  },
}))

// ─── Render helper ────────────────────────────────────────────────────────────

const renderModal = ({ isOpen = true, onClose = vi.fn() }: { isOpen?: boolean; onClose?: () => void } = {}) =>
  render(
    <I18nProvider i18n={i18n}>
      <PortalProvider>
        <ManageCredentialsModal isOpen={isOpen} onClose={onClose} />
      </PortalProvider>
    </I18nProvider>
  )

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ManageCredentialsModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockPermissions = { canCreateCredential: true, canDeleteCredential: true }
    mockPermissionsError = false
    mockState.credentials = [
      { id: TEST_CREDENTIAL_ID, access: TEST_ACCESS, user_id: "user-1", project_id: mockProjectId },
    ]
    mockState.isLoadingCredentials = false
    mockState.listError = null
    mockState.status = { hasCredentials: true, endpoint: "https://s3.example.com", region: "eu-de-1" }
    mockState.statusError = null
    mockState.revealResult = {
      id: TEST_CREDENTIAL_ID,
      access: TEST_ACCESS,
      secret: TEST_SECRET,
      user_id: "user-1",
      project_id: mockProjectId,
    }
    mockState.revealError = null
    mockState.isRevealPending = false
    mockState.createResult = null
    mockState.createError = null
    mockState.isCreatePending = false
    mockState.isDeletePending = false
    mockState.deleteError = null
    mockState.createOptions = {}
    mockState.deleteOptions = {}
    await act(async () => {
      i18n.activate("en")
    })
  })

  describe("Secret display", () => {
    test("fetches and shows every key's secret as soon as the modal opens", async () => {
      renderModal()

      await waitFor(() => {
        expect(mockRevealMutateAsync).toHaveBeenCalledWith({
          project_id: mockProjectId,
          credentialId: TEST_CREDENTIAL_ID,
        })
      })
      expect(await screen.findByText(TEST_SECRET)).toBeInTheDocument()
      // The reveal control is gone - there is nothing left to click.
      expect(screen.queryByRole("button", { name: "Show" })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Hide" })).not.toBeInTheDocument()
    })

    // One key failing to load is not a reason to blank the other, and not a modal-wide error
    // either: the row that couldn't be filled is where the user needs to be told.
    test("reports a failed secret in its own row and still shows the other key's", async () => {
      mockState.credentials = [
        { id: TEST_CREDENTIAL_ID, access: TEST_ACCESS, user_id: "user-1", project_id: mockProjectId },
        { id: "cred-2", access: "AKIASECONDKEY000000", user_id: "user-1", project_id: mockProjectId },
      ]
      mockRevealMutateAsync
        .mockImplementationOnce(async () => mockState.revealResult)
        .mockImplementationOnce(async () => {
          throw new Error("Credential not found")
        })

      renderModal()

      expect(await screen.findByText(TEST_SECRET)).toBeInTheDocument()
      expect(await screen.findByText("Could not load secret")).toBeInTheDocument()
    })

    // A failed permission lookup is not a denial. The hook falls back to all-false permissions on
    // error, so without telling the two apart the user is told to go ask an administrator for
    // access they already have.
    test("shows a check-failed message, not a denial, when the permission query errors", async () => {
      mockPermissionsError = true
      renderModal()

      expect(screen.getByText("Could Not Check Permissions")).toBeInTheDocument()
      expect(screen.queryByText("Insufficient Permissions")).not.toBeInTheDocument()
    })

    // Closing the modal does not abort a request already in flight, and the modal stays mounted,
    // so the completion handler still runs. It must not repopulate state handleClose just cleared.
    // The reopened modal's own fetch is held pending here, so anything on screen could only have
    // come from the stale one.
    test("drops a secret that arrives after the modal was closed", async () => {
      let resolveReveal: (value: CredentialWithSecret) => void = () => {}
      mockRevealMutateAsync
        .mockImplementationOnce(() => new Promise<CredentialWithSecret>((resolve) => (resolveReveal = resolve)))
        .mockImplementationOnce(() => new Promise<CredentialWithSecret>(() => {}))

      const user = userEvent.setup()
      const onClose = vi.fn()
      const modal = (isOpen: boolean) => (
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageCredentialsModal isOpen={isOpen} onClose={onClose} />
          </PortalProvider>
        </I18nProvider>
      )
      const { rerender } = render(modal(true))

      await waitFor(() => expect(mockRevealMutateAsync).toHaveBeenCalledTimes(1))
      await user.click(screen.getByRole("button", { name: "Close" }))
      rerender(modal(false))

      await act(async () => {
        resolveReveal({
          id: TEST_CREDENTIAL_ID,
          access: TEST_ACCESS,
          secret: TEST_SECRET,
          user_id: "user-1",
          project_id: mockProjectId,
        })
      })

      rerender(modal(true))

      expect(screen.queryByText(TEST_SECRET)).not.toBeInTheDocument()
    })

    // `handleClose` is not the only way out: Escape reaches Juno's Modal through the focus trap's
    // `escapeDeactivates`, which ignores `disableCancelButton`/`disableCloseButton`, and a parent
    // may drop `isOpen` on its own. Either way the per-opening bookkeeping has to be reset on the
    // way in, or an id marked "already fetched" with no secret behind it strands that row.
    test("a close that bypasses handleClose still leaves the next opening able to fetch", async () => {
      const onClose = vi.fn()
      const modal = (isOpen: boolean) => (
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageCredentialsModal isOpen={isOpen} onClose={onClose} />
          </PortalProvider>
        </I18nProvider>
      )
      const { rerender } = render(modal(true))

      await waitFor(() => expect(mockRevealMutateAsync).toHaveBeenCalledTimes(1))

      // Closed by the parent - no Close click, so `handleClose` never runs.
      rerender(modal(false))
      rerender(modal(true))

      await waitFor(() => expect(mockRevealMutateAsync).toHaveBeenCalledTimes(2))
      expect(await screen.findByText(TEST_SECRET)).toBeInTheDocument()
    })

    test("closing clears the secrets and reopening fetches them again", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const { rerender } = renderModal({ onClose })

      expect(await screen.findByText(TEST_SECRET)).toBeInTheDocument()
      expect(mockRevealMutateAsync).toHaveBeenCalledTimes(1)

      // Close (onCancel wired to the modal's Close button)
      await user.click(screen.getByRole("button", { name: "Close" }))
      expect(onClose).toHaveBeenCalled()

      // Simulate the parent re-closing then re-opening the modal
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageCredentialsModal isOpen={false} onClose={onClose} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageCredentialsModal isOpen={true} onClose={onClose} />
          </PortalProvider>
        </I18nProvider>
      )

      expect(await screen.findByText(TEST_SECRET)).toBeInTheDocument()
      await waitFor(() => expect(mockRevealMutateAsync).toHaveBeenCalledTimes(2))
    })
  })

  describe("Create Access Key", () => {
    test("creating shows the new secret immediately, toasts where to find it, and invalidates queries", async () => {
      const user = userEvent.setup()
      mockState.createResult = {
        id: "cred-2",
        access: "AKIANEWKEY0000000002",
        secret: "new-secret-value",
        user_id: "user-1",
        project_id: mockProjectId,
      }
      renderModal()

      await user.click(screen.getByRole("button", { name: "Create Access Key" }))

      expect(mockCreateMutate).toHaveBeenCalledWith({ project_id: mockProjectId })
      expect(await screen.findByText("new-secret-value")).toBeInTheDocument()
      expect(mockInvalidateList).toHaveBeenCalled()
      await waitFor(() => expect(toast.success).toHaveBeenCalled())

      // A second key changes no bucket, so the expensive `includeMetadata` listing is left alone.
      expect(mockInvalidateContainersList).not.toHaveBeenCalled()
      expect(mockInvalidateStatus).not.toHaveBeenCalled()
    })

    test("creating the project's first key refreshes the bucket listing", async () => {
      const user = userEvent.setup()
      mockState.credentials = []
      mockState.createResult = {
        id: "cred-1",
        access: "AKIAFIRSTKEY00000001",
        secret: "first-secret-value",
        user_id: "user-1",
        project_id: mockProjectId,
      }
      renderModal()

      await user.click(screen.getByRole("button", { name: "Create Access Key" }))

      // 0 -> 1 is when `containers.list` stops throwing NO_CEPH_CREDENTIALS behind the modal.
      expect(mockInvalidateContainersList).toHaveBeenCalled()
    })

    test("shows a limit error message without closing the modal when the limit is reached", async () => {
      const user = userEvent.setup()
      mockState.createError = "EC2_CREDENTIAL_LIMIT_REACHED"
      const onClose = vi.fn()
      renderModal({ onClose })

      await user.click(screen.getByRole("button", { name: "Create Access Key" }))

      expect(await screen.findByText(/you already hold the maximum of 2/)).toBeInTheDocument()
      expect(onClose).not.toHaveBeenCalled()
    })

    test("disables Create when already at the limit, with the rule stated in the section description", () => {
      mockState.credentials = [
        { id: "cred-1", access: "AKIA1", user_id: "user-1", project_id: mockProjectId },
        { id: "cred-2", access: "AKIA2", user_id: "user-1", project_id: mockProjectId },
      ]
      renderModal()

      expect(screen.getByRole("button", { name: "Create Access Key" })).toBeDisabled()
      expect(screen.getByText(/at most 2 access keys/)).toBeInTheDocument()
    })

    test("disables Create and shows an info message when the user lacks permission (not hidden)", () => {
      mockPermissions = { canCreateCredential: false, canDeleteCredential: true }
      renderModal()

      expect(screen.getByRole("button", { name: "Create Access Key" })).toBeDisabled()
      expect(screen.getByText("Insufficient Permissions")).toBeInTheDocument()
    })
  })

  describe("Delete Access Key", () => {
    test("the trash button deletes on the click, shows a toast, and invalidates queries", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))

      expect(mockDeleteMutate).toHaveBeenCalledWith({
        project_id: mockProjectId,
        credentialId: TEST_CREDENTIAL_ID,
      })
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
      expect(mockInvalidateList).toHaveBeenCalled()
      // The fixture holds one key, so this delete empties the project: 1 -> 0.
      expect(mockInvalidateContainersList).toHaveBeenCalled()
      // Its only reader takes endpoint/region from it, and those don't move.
      expect(mockInvalidateStatus).not.toHaveBeenCalled()
    })

    test("deleting a key that is not the last leaves the bucket listing alone", async () => {
      const user = userEvent.setup()
      mockState.credentials = [
        { id: TEST_CREDENTIAL_ID, access: TEST_ACCESS, user_id: "user-1", project_id: mockProjectId },
        { id: "cred-2", access: "AKIASECONDKEY000000", user_id: "user-1", project_id: mockProjectId },
      ]
      renderModal()

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))

      expect(mockInvalidateList).toHaveBeenCalled()
      expect(mockInvalidateContainersList).not.toHaveBeenCalled()
    })

    test("hides the delete button when the user lacks permission", () => {
      mockPermissions = { canCreateCredential: true, canDeleteCredential: false }
      renderModal()

      expect(screen.queryByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`)).not.toBeInTheDocument()
    })
  })

  describe("Empty state", () => {
    test("shows an empty status with column headers still visible when there are no keys", () => {
      mockState.credentials = []
      renderModal()

      expect(screen.getByText("No Access Keys")).toBeInTheDocument()
      expect(screen.getByText("Access Key ID")).toBeInTheDocument()
      expect(screen.getByText("Secret Access Key")).toBeInTheDocument()
    })
  })

  describe("Connection Details", () => {
    test("shows endpoint and region even with zero keys", () => {
      mockState.credentials = []
      renderModal()

      expect(screen.getByText("https://s3.example.com")).toBeInTheDocument()
      expect(screen.getByText("eu-de-1")).toBeInTheDocument()
    })

    test("shows an error status when status fails, but the key table still renders", () => {
      mockState.statusError = { message: "Ceph service not found in OpenStack service catalog" }
      renderModal()

      expect(screen.getByText("Connection Details Unavailable")).toBeInTheDocument()
      expect(screen.getByText("Access Key ID")).toBeInTheDocument()
      expect(screen.getByText(TEST_ACCESS)).toBeInTheDocument()
    })
  })
})
