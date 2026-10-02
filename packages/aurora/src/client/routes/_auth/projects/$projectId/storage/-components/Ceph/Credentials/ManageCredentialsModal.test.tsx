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
let mockPermissionsLoading = false

vi.mock("../hooks/useCephPermissions", () => ({
  useCephPermissions: () => ({
    permissions: mockPermissions,
    isLoading: mockPermissionsLoading,
    isError: mockPermissionsError,
  }),
}))

// ─── tRPC mock ────────────────────────────────────────────────────────────────

const TEST_CREDENTIAL_ID = "cred-1"
const TEST_ACCESS = "AKIAEXAMPLE0000000001"
const TEST_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

type Credential = { id: string; access: string; user_id: string; project_id: string }
type CredentialWithSecret = Credential & { secret: string }

const {
  mockRefetchList,
  mockInvalidateContainersList,
  mockInvalidateStatus,
  mockRevealMutateAsync,
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
    // No secret: `create` answers without one, and the component has nothing to do with it.
    createResult: null as Credential | null,
    createError: null as string | null,
    isCreatePending: false,
    isDeletePending: false,
    deleteError: null as string | null,
    createOptions: {} as {
      onSuccess?: (cred: Credential) => void
      onError?: (err: { message: string }) => void
    },
    deleteOptions: {} as { onSuccess?: () => void; onError?: (err: { message: string }) => void },
  }

  const mockRefetchList = vi.fn()
  const mockInvalidateContainersList = vi.fn()
  const mockInvalidateStatus = vi.fn()

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
    mockRefetchList,
    mockInvalidateContainersList,
    mockInvalidateStatus,
    mockRevealMutateAsync,
    mockCreateMutate,
    mockCreateReset,
    mockDeleteMutate,
    mockDeleteReset,
    mockState,
  }
})

vi.mock("@/client/trpcClient", () => ({
  // `reveal` is the one call the component makes through the vanilla client rather than a React
  // hook - see its comment there - so it is mocked separately from the `trpcReact` tree below.
  trpcClient: {
    storage: { ceph: { ec2Credentials: { reveal: { mutate: mockRevealMutateAsync } } } },
  },
  trpcReact: {
    useUtils: () => ({
      storage: {
        ceph: {
          ec2Credentials: {
            list: {
              // The helper refetches the key table and decides from what comes back, not from the
              // component's copy. The mutation mocks below keep `mockState.credentials` in step,
              // so resolving with it is what a settled refetch would have answered.
              fetch: (...args: unknown[]) => {
                mockRefetchList(...args)
                return Promise.resolve(mockState.credentials)
              },
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
    mockPermissionsLoading = false
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
    const secretField = (id = TEST_CREDENTIAL_ID) => screen.getByTestId(`secret-${id}`)
    const toggle = (id = TEST_CREDENTIAL_ID) => screen.getByTestId(`toggle-secret-${id}`)

    // The whole point of the control: nothing real is pulled until it is asked for, and the field
    // is not empty in the meantime - it holds filler of the same length behind `type="password"`.
    test("fetches nothing until Reveal is clicked, then fills that key's field", async () => {
      const user = userEvent.setup()
      renderModal()

      expect(mockRevealMutateAsync).not.toHaveBeenCalled()
      expect(secretField()).toHaveAttribute("type", "password")
      expect(secretField()).not.toHaveValue(TEST_SECRET)
      // A real secret is base64 of the 40 random bytes `create` generates - 56 characters - and the
      // filler matches it so the field doesn't change shape when the value lands. The fixture
      // secret above is shorter, so this is the literal rather than TEST_SECRET.length.
      expect((secretField() as HTMLInputElement).value).toHaveLength(56)

      await user.click(toggle())

      await waitFor(() => {
        expect(mockRevealMutateAsync).toHaveBeenCalledWith({
          project_id: mockProjectId,
          credentialId: TEST_CREDENTIAL_ID,
        })
      })
      await waitFor(() => expect(secretField()).toHaveValue(TEST_SECRET))
      expect(secretField()).toHaveAttribute("type", "text")
      expect(toggle()).toHaveAccessibleName("Hide")
    })

    // Hide throws the value away rather than painting over a live one, so the next Reveal is a
    // second request. That extra request is the behaviour under test, not an accident.
    test("hiding discards the secret, and revealing again refetches it", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(toggle())
      await waitFor(() => expect(secretField()).toHaveValue(TEST_SECRET))

      await user.click(toggle())

      expect(secretField()).toHaveAttribute("type", "password")
      expect(secretField()).not.toHaveValue(TEST_SECRET)
      expect(mockRevealMutateAsync).toHaveBeenCalledTimes(1)

      await user.click(toggle())

      await waitFor(() => expect(mockRevealMutateAsync).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(secretField()).toHaveValue(TEST_SECRET))
    })

    test("the field stays read-only once revealed", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(toggle())
      await waitFor(() => expect(secretField()).toHaveValue(TEST_SECRET))

      expect(secretField()).toHaveAttribute("readonly")
      await user.type(secretField(), "tampered")
      expect(secretField()).toHaveValue(TEST_SECRET)
    })

    // One key failing to load is not a reason to blank the other, and not a modal-wide error
    // either: the field that couldn't be filled is where the user needs to be told.
    test("reports a failed secret on its own key and still fills the other", async () => {
      const user = userEvent.setup()
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

      await user.click(toggle())
      await waitFor(() => expect(secretField()).toHaveValue(TEST_SECRET))

      await user.click(toggle("cred-2"))

      // One error surface for the whole modal, naming the key it belongs to - not an `errortext`
      // hanging off the field that failed.
      expect(
        await screen.findByText('Could not load the secret for access key "AKIASECONDKEY000000". Try again.')
      ).toBeInTheDocument()
      expect(secretField()).toHaveValue(TEST_SECRET)
      expect(secretField("cred-2")).not.toHaveValue(TEST_SECRET)
    })

    test("revealing again after a failure retries the fetch", async () => {
      const user = userEvent.setup()
      mockRevealMutateAsync
        .mockImplementationOnce(async () => {
          throw new Error("Credential not found")
        })
        .mockImplementationOnce(async () => mockState.revealResult)

      renderModal()

      await user.click(toggle())
      expect(
        await screen.findByText(`Could not load the secret for access key "${TEST_ACCESS}". Try again.`)
      ).toBeInTheDocument()

      await user.click(toggle())

      await waitFor(() => expect(mockRevealMutateAsync).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(secretField()).toHaveValue(TEST_SECRET))
    })

    // Nothing in the modal is clickable while a create or delete is in flight - Close, the X,
    // Escape, Create and the row's delete button are all disabled, and Reveal is the last one that
    // was not. A reveal started against a row that is being deleted reports NOT_FOUND for a key the
    // user just removed, or lands after the row is gone and leaves its secret in state.
    test("disables Reveal while a delete is in flight", () => {
      mockState.isDeletePending = true
      renderModal()

      expect(toggle()).toBeDisabled()
    })

    test("disables Reveal while a create is in flight", () => {
      mockState.isCreatePending = true
      renderModal()

      expect(toggle()).toBeDisabled()
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
    // The same late answer, but arriving while the modal is open again. Guarding on "is a modal
    // open" rather than "is it the same opening" lets this one through, and the field unmasks
    // itself in an opening where nobody clicked Reveal.
    test("drops a secret that arrives after the modal was closed and reopened", async () => {
      let resolveReveal: (value: CredentialWithSecret) => void = () => {}
      mockRevealMutateAsync.mockImplementationOnce(
        () => new Promise<CredentialWithSecret>((resolve) => (resolveReveal = resolve))
      )

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

      await user.click(toggle())
      await waitFor(() => expect(mockRevealMutateAsync).toHaveBeenCalledTimes(1))

      await user.click(screen.getByRole("button", { name: "Close" }))
      rerender(modal(false))
      rerender(modal(true))

      await act(async () => {
        resolveReveal({
          id: TEST_CREDENTIAL_ID,
          access: TEST_ACCESS,
          secret: TEST_SECRET,
          user_id: "user-1",
          project_id: mockProjectId,
        })
      })

      expect(secretField()).not.toHaveValue(TEST_SECRET)
    })

    test("drops a secret that arrives after the modal was closed", async () => {
      let resolveReveal: (value: CredentialWithSecret) => void = () => {}
      mockRevealMutateAsync.mockImplementationOnce(
        () => new Promise<CredentialWithSecret>((resolve) => (resolveReveal = resolve))
      )

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

      await user.click(toggle())
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

      expect(secretField()).not.toHaveValue(TEST_SECRET)
    })

    // The modal never closes here, so the opening counter lets this one through: a reveal fired
    // before the delete lands afterwards and writes the secret of a key that is gone. Nothing
    // renders it - the row has been removed - which is exactly the problem: no Hide can reach it
    // and it sits in state until the modal is closed. The test observes that state by putting the
    // row back afterwards, which is the only way to see a value the UI itself no longer shows.
    test("drops a secret that arrives after its own key was deleted", async () => {
      let resolveReveal: (value: CredentialWithSecret) => void = () => {}
      mockRevealMutateAsync.mockImplementationOnce(
        () => new Promise<CredentialWithSecret>((resolve) => (resolveReveal = resolve))
      )

      const user = userEvent.setup()
      const modal = () => (
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageCredentialsModal isOpen onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      const credential = mockState.credentials[0]
      const { rerender } = render(modal())

      await user.click(screen.getByTestId(`toggle-secret-${TEST_CREDENTIAL_ID}`))
      await waitFor(() => expect(mockRevealMutateAsync).toHaveBeenCalledTimes(1))

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))
      await user.click(screen.getByRole("button", { name: "Delete Access Key" }))
      expect(screen.queryByTestId(`secret-${TEST_CREDENTIAL_ID}`)).not.toBeInTheDocument()

      await act(async () => {
        resolveReveal({
          id: TEST_CREDENTIAL_ID,
          access: TEST_ACCESS,
          secret: TEST_SECRET,
          user_id: "user-1",
          project_id: mockProjectId,
        })
      })

      mockState.credentials = [credential]
      rerender(modal())

      expect(screen.getByTestId(`secret-${TEST_CREDENTIAL_ID}`)).not.toHaveValue(TEST_SECRET)
    })

    // `handleClose` is not the only way out: Escape reaches Juno's Modal through the focus trap's
    // `escapeDeactivates`, which ignores `disableCancelButton`/`disableCloseButton`, and a parent
    // may drop `isOpen` on its own. Either way the next opening has to be able to fetch again.
    test("a close that bypasses handleClose still leaves the next opening able to fetch", async () => {
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

      await user.click(toggle())
      await waitFor(() => expect(mockRevealMutateAsync).toHaveBeenCalledTimes(1))

      // Closed by the parent - no Close click, so `handleClose` never runs.
      rerender(modal(false))
      rerender(modal(true))

      await user.click(toggle())

      await waitFor(() => expect(mockRevealMutateAsync).toHaveBeenCalledTimes(2))
      await waitFor(() => expect(secretField()).toHaveValue(TEST_SECRET))
    })

    test("closing clears the revealed secret and reopening starts concealed again", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const { rerender } = renderModal({ onClose })

      await user.click(toggle())
      await waitFor(() => expect(secretField()).toHaveValue(TEST_SECRET))

      await user.click(screen.getByRole("button", { name: "Close" }))
      expect(onClose).toHaveBeenCalled()

      const modal = (isOpen: boolean) => (
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageCredentialsModal isOpen={isOpen} onClose={onClose} />
          </PortalProvider>
        </I18nProvider>
      )
      rerender(modal(false))
      rerender(modal(true))

      expect(secretField()).toHaveAttribute("type", "password")
      expect(secretField()).not.toHaveValue(TEST_SECRET)
      expect(toggle()).toHaveAccessibleName("Reveal")
      expect(mockRevealMutateAsync).toHaveBeenCalledTimes(1)
    })
  })

  describe("Create Access Key", () => {
    // The secret `create` answers with is dropped, not shown: a new key is concealed like every
    // other row and is read through its own Reveal, which is the only thing that fetches a secret.
    test("the new key appears concealed, toasts where to find it, and invalidates queries", async () => {
      const user = userEvent.setup()
      mockState.createResult = {
        id: "cred-2",
        access: "AKIANEWKEY0000000002",
        user_id: "user-1",
        project_id: mockProjectId,
      }
      const modal = () => (
        <I18nProvider i18n={i18n}>
          <PortalProvider>
            <ManageCredentialsModal isOpen onClose={vi.fn()} />
          </PortalProvider>
        </I18nProvider>
      )
      const { rerender } = render(modal())

      await user.click(screen.getByRole("button", { name: "Create Access Key" }))

      expect(mockCreateMutate).toHaveBeenCalledWith({ project_id: mockProjectId })
      expect(mockRefetchList).toHaveBeenCalled()
      await waitFor(() => expect(toast.success).toHaveBeenCalled())

      // Nothing in the component's own state changes on a create now that the secret is dropped,
      // so the re-render the refetched list would cause is stood in for here - the mocked list
      // query reads `mockState.credentials`, which the create mock has already appended to.
      rerender(modal())

      const field = screen.getByTestId("secret-cred-2")
      expect(field).toHaveAttribute("type", "password")
      expect(field).toHaveValue("\u2022".repeat(56))
      expect(screen.getByTestId("toggle-secret-cred-2")).toHaveAccessibleName("Reveal")
      expect(mockRevealMutateAsync).not.toHaveBeenCalled()

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
        user_id: "user-1",
        project_id: mockProjectId,
      }
      renderModal()

      await user.click(screen.getByRole("button", { name: "Create Access Key" }))

      // 0 -> 1 is when `containers.list` stops throwing NO_CEPH_CREDENTIALS behind the modal.
      expect(mockInvalidateContainersList).toHaveBeenCalled()
    })

    test("reports a failed create in the modal's message without closing it", async () => {
      const user = userEvent.setup()
      mockState.createError = "Failed to create EC2 credentials."
      const onClose = vi.fn()
      renderModal({ onClose })

      await user.click(screen.getByRole("button", { name: "Create Access Key" }))

      expect(await screen.findByText("Failed to create EC2 credentials.")).toBeInTheDocument()
      expect(onClose).not.toHaveBeenCalled()
    })

    // There is no ceiling on the number of keys: Keystone and RGW impose none, and all of a
    // user's keys in a project map to the same RGW identity. Create stays available however
    // many already exist, and the section description makes no claim about a maximum.
    test("leaves Create enabled no matter how many keys already exist", () => {
      mockState.credentials = [
        { id: "cred-1", access: "AKIA1", user_id: "user-1", project_id: mockProjectId },
        { id: "cred-2", access: "AKIA2", user_id: "user-1", project_id: mockProjectId },
        { id: "cred-3", access: "AKIA3", user_id: "user-1", project_id: mockProjectId },
      ]
      renderModal()

      expect(screen.getByRole("button", { name: "Create Access Key" })).toBeEnabled()
      expect(screen.queryByText(/at most/)).not.toBeInTheDocument()
    })

    test("hides Create and says who to ask when the user lacks permission", () => {
      mockPermissions = { canCreateCredential: false, canDeleteCredential: true }
      renderModal()

      expect(screen.queryByRole("button", { name: "Create Access Key" })).not.toBeInTheDocument()
      expect(screen.getByText("Insufficient Permissions")).toBeInTheDocument()
      expect(screen.getByText(/permission to create S3 access keys/)).toBeInTheDocument()
    })

    // The permission check is still running: nothing is known yet, so nothing is claimed. Hiding
    // the button here would make it appear a moment later, under a section that had already
    // finished drawing.
    test("keeps Create on screen, disabled, while permissions are still loading", () => {
      // What the hook actually hands back until the query settles: DEFAULT_PERMISSIONS, all false.
      // Read on its own that is indistinguishable from a denial, which is what `isLoading` is for.
      mockPermissions = { canCreateCredential: false, canDeleteCredential: false }
      mockPermissionsLoading = true
      renderModal()

      expect(screen.getByRole("button", { name: "Create Access Key" })).toBeDisabled()
      expect(screen.queryByText("Insufficient Permissions")).not.toBeInTheDocument()
    })
  })

  describe("Delete Access Key", () => {
    // The row's button opens the confirmation dialog; `confirmDelete` is the second click that
    // actually deletes. Matched by role so it is the dialog's button and not the row's, which is
    // labelled after its own key.
    const confirmDelete = () => screen.getByRole("button", { name: "Delete Access Key" })

    test("the trash button asks before deleting, naming the key", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))

      expect(mockDeleteMutate).not.toHaveBeenCalled()
      expect(screen.getByText(TEST_ACCESS)).toBeInTheDocument()
      expect(confirmDelete()).toBeInTheDocument()
    })

    // Deleting the last key is not just "one fewer key": without one the BFF cannot sign a single
    // Ceph request, so the storage goes out of reach in the dashboard too. The reassuring half -
    // buckets survive, a new key reaches them - is part of the same warning.
    test("warns that this is the last key, and only when it is", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))

      expect(screen.getByText(/This is the last access key in this project/)).toBeInTheDocument()
      expect(screen.getByText(/buckets and their contents are not deleted/)).toBeInTheDocument()
    })

    test("does not warn about the last key when another one remains", async () => {
      const user = userEvent.setup()
      mockState.credentials = [
        { id: TEST_CREDENTIAL_ID, access: TEST_ACCESS, user_id: "user-1", project_id: mockProjectId },
        { id: "cred-2", access: "AKIASECONDKEY000000", user_id: "user-1", project_id: mockProjectId },
      ]
      renderModal()

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))

      expect(screen.getByRole("button", { name: "Delete Access Key" })).toBeInTheDocument()
      expect(screen.queryByText(/This is the last access key in this project/)).not.toBeInTheDocument()
    })

    test("cancelling the confirmation leaves the key alone", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))
      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(mockDeleteMutate).not.toHaveBeenCalled()
      expect(screen.queryByRole("button", { name: "Delete Access Key" })).not.toBeInTheDocument()
      // The row is still there, and so is the modal behind the dialog.
      expect(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`)).toBeInTheDocument()
    })

    // The dialog reports itself, under its own prefix: the parent's open/close says nothing about
    // how often a delete is started and then abandoned.
    test("reports the confirmation dialog's own open and close", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))
      expect(mockOnTrackEvent).toHaveBeenCalledWith({
        source: "modal",
        action: "storage.ceph.credentials.delete.open",
      })

      await user.click(screen.getByRole("button", { name: "Cancel" }))
      expect(mockOnTrackEvent).toHaveBeenCalledWith({
        source: "modal",
        action: "storage.ceph.credentials.delete.close",
      })
    })

    // Answered yes, so no `.close` - what happened next is the parent's to report.
    test("does not report a close when the dialog is confirmed", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))
      await user.click(confirmDelete())

      expect(mockOnTrackEvent).not.toHaveBeenCalledWith({
        source: "modal",
        action: "storage.ceph.credentials.delete.close",
      })
    })

    test("confirming deletes, shows a toast, and invalidates queries", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))
      await user.click(confirmDelete())

      expect(mockDeleteMutate).toHaveBeenCalledWith({
        project_id: mockProjectId,
        credentialId: TEST_CREDENTIAL_ID,
      })
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled()
      })
      expect(mockRefetchList).toHaveBeenCalled()
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
      await user.click(confirmDelete())

      expect(mockRefetchList).toHaveBeenCalled()
      expect(mockInvalidateContainersList).not.toHaveBeenCalled()
    })

    // The dialog's only job is confirming: it closes on confirm and the row's spinner carries the
    // request from there, so the user is not left looking at a dialog with no progress in it.
    test("the confirmation closes as soon as it is confirmed", async () => {
      const user = userEvent.setup()
      renderModal()

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))
      await user.click(confirmDelete())

      expect(screen.queryByRole("button", { name: "Delete Access Key" })).not.toBeInTheDocument()
    })

    // A credential that is already gone comes back as NOT_FOUND, not as a deletion that happened.
    // The toast carries what the server said, and the list is refreshed anyway so the row for a
    // key Keystone no longer has does not stay on screen.
    test("reports a failed delete in a toast and still refreshes the list", async () => {
      const user = userEvent.setup()
      mockState.deleteError = "Credential not found"
      renderModal()

      await user.click(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`))
      await user.click(confirmDelete())

      // An error toast, not a success one and not the modal's error Message. Its wording is
      // covered in CredentialToastNotifications.test.tsx, where the rest of the toasts are.
      await waitFor(() => expect(toast.error).toHaveBeenCalled())
      expect(toast.success).not.toHaveBeenCalled()
      expect(mockRefetchList).toHaveBeenCalled()
    })

    test("hides the delete button when the user lacks permission, and says who to ask", () => {
      mockPermissions = { canCreateCredential: true, canDeleteCredential: false }
      renderModal()

      expect(screen.queryByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`)).not.toBeInTheDocument()
      expect(screen.getByText(/permission to delete S3 access keys/)).toBeInTheDocument()
    })

    // Same rule as the Create button: only a definite no hides it. Otherwise the action column
    // starts blank and grows buttons once the check settles.
    test("keeps the delete button on screen, disabled, while permissions are still loading", () => {
      mockPermissions = { canCreateCredential: false, canDeleteCredential: false }
      mockPermissionsLoading = true
      renderModal()

      expect(screen.getByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`)).toBeDisabled()
    })

    // Neither mutation is available, and the one message covers both. What stays is the part this
    // user can still act on: their keys, the endpoint and the region - reading those is not gated.
    test("names both actions in one message when the user may neither create nor delete", () => {
      mockPermissions = { canCreateCredential: false, canDeleteCredential: false }
      renderModal()

      expect(screen.getAllByText("Insufficient Permissions")).toHaveLength(1)
      expect(screen.getByText(/permission to create or delete S3 access keys/)).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Create Access Key" })).not.toBeInTheDocument()
      expect(screen.queryByTestId(`delete-credential-${TEST_CREDENTIAL_ID}`)).not.toBeInTheDocument()
      expect(screen.getByDisplayValue(TEST_ACCESS)).toBeInTheDocument()
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
      expect(screen.getByTestId(`access-${TEST_CREDENTIAL_ID}`)).toHaveValue(TEST_ACCESS)
    })
  })
})
