import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CorsRuleModal } from "./CorsRuleModal"
import type { CorsRuleRead } from "@/server/Storage/types/ceph"
import { trpcReact } from "@/client/trpcClient"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { messages as enMessages } from "@/locales/en/messages"

/* eslint-disable @typescript-eslint/no-explicit-any */

// Initialize i18n
i18n.load("en", enMessages)
i18n.activate("en")

// Mock dependencies
const mockMarkSubmitted = vi.fn()
const mockTrackClose = vi.fn()
const mockResetTracking = vi.fn()

vi.mock("@/client/hooks/useModalTracking", () => ({
  useModalTracking: () => ({
    trackClose: mockTrackClose,
    markSubmitted: mockMarkSubmitted,
    resetTracking: mockResetTracking,
  }),
}))

vi.mock("@/client/hooks/useProjectId", () => ({
  useProjectId: () => "test-project-id",
}))

vi.mock("@/client/trpcClient", () => ({
  trpcReact: {
    useUtils: vi.fn(() => ({
      storage: {
        ceph: {
          cors: {
            get: {
              invalidate: vi.fn(),
            },
          },
        },
      },
    })),
    storage: {
      ceph: {
        cors: {
          get: {
            useQuery: vi.fn(() => ({
              data: { corsRules: [] },
              isLoading: false,
              error: null,
            })),
          },
          set: {
            useMutation: vi.fn(() => ({
              mutate: vi.fn(),
              isPending: false,
              isError: false,
              error: null,
              reset: vi.fn(),
            })),
          },
        },
      },
    },
  },
}))

const mockEditingRule: CorsRuleRead = {
  ID: "existing-rule",
  AllowedOrigins: ["https://example.com"],
  AllowedMethods: ["GET", "POST"],
  AllowedHeaders: ["Content-Type"],
  ExposeHeaders: ["ETag"],
  MaxAgeSeconds: 3600,
}

describe("CorsRuleModal", () => {
  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()
  const mockOnClose = vi.fn()

  const Wrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not render when isOpen is false", () => {
    render(
      <CorsRuleModal
        isOpen={false}
        bucketName="test-bucket"
        editingIndex={null}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onClose={mockOnClose}
      />,
      { wrapper: Wrapper }
    )

    expect(screen.queryByText(/Configure New Rule/i)).not.toBeInTheDocument()
  })

  it("renders with 'Create CORS Rule' title when adding new rule", () => {
    render(
      <CorsRuleModal
        isOpen={true}
        bucketName="test-bucket"
        editingIndex={null}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onClose={mockOnClose}
      />,
      { wrapper: Wrapper }
    )

    expect(screen.getByRole("heading", { level: 4, name: /Create CORS Rule/i })).toBeInTheDocument()
  })

  it("renders with 'Edit CORS Rule' title when editing existing rule", () => {
    ;(trpcReact.storage.ceph.cors.get.useQuery as any).mockReturnValue({
      data: {
        corsRules: [mockEditingRule],
      },
      isLoading: false,
      error: null,
    })

    render(
      <CorsRuleModal
        isOpen={true}
        bucketName="test-bucket"
        editingIndex={0}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onClose={mockOnClose}
      />,
      { wrapper: Wrapper }
    )

    expect(screen.getByText(/Edit CORS Rule/i)).toBeInTheDocument()
  })

  it("prefills form fields when editing existing rule", () => {
    ;(trpcReact.storage.ceph.cors.get.useQuery as any).mockReturnValue({
      data: {
        corsRules: [mockEditingRule],
      },
      isLoading: false,
      error: null,
    })

    render(
      <CorsRuleModal
        isOpen={true}
        bucketName="test-bucket"
        editingIndex={0}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onClose={mockOnClose}
      />,
      { wrapper: Wrapper }
    )

    // Check that the ID field is prefilled
    const idInput = screen.getByLabelText(/Rule ID/i)
    expect(idInput).toHaveValue("existing-rule")

    // Check that methods are checked
    const getCheckbox = screen.getByRole("checkbox", { name: "GET" })
    const postCheckbox = screen.getByRole("checkbox", { name: "POST" })
    expect(getCheckbox).toBeChecked()
    expect(postCheckbox).toBeChecked()

    // Check that MaxAgeSeconds is prefilled
    const maxAgeInput = screen.getByLabelText(/Max Age in Seconds/i)
    expect(maxAgeInput).toHaveValue(3600)
  })

  it("calls mutation when form is submitted", async () => {
    const user = userEvent.setup()
    const mockMutate = vi.fn()

    ;(trpcReact.storage.ceph.cors.set.useMutation as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })

    render(
      <CorsRuleModal
        isOpen={true}
        bucketName="test-bucket"
        editingIndex={null}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onClose={mockOnClose}
      />,
      { wrapper: Wrapper }
    )

    // Fill in minimal required fields
    const getCheckbox = screen.getByRole("checkbox", { name: "GET" })
    await user.click(getCheckbox)

    // Add an allowed origin (TagInput - we need to type and press Enter)
    const originInput = screen.getByPlaceholderText(/https:\/\/example.com or/i)
    await user.type(originInput, "https://test.com{Enter}")

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /Create CORS Rule/i })
    await user.click(submitButton)

    // Should call mutation
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: "test-project-id",
          bucketName: "test-bucket",
          corsConfiguration: expect.objectContaining({
            CORSRules: expect.arrayContaining([
              expect.objectContaining({
                AllowedOrigins: ["https://test.com"],
                AllowedMethods: ["GET"],
              }),
            ]),
          }),
        })
      )
    })
  })

  it("calls tRPC mutation on submit (verifying network behavior)", async () => {
    const user = userEvent.setup()
    const mockMutate = vi.fn()

    ;(trpcReact.storage.ceph.cors.set.useMutation as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })

    render(
      <CorsRuleModal
        isOpen={true}
        bucketName="test-bucket"
        editingIndex={null}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onClose={mockOnClose}
      />,
      { wrapper: Wrapper }
    )

    // Fill in minimal required fields
    const getCheckbox = screen.getByRole("checkbox", { name: "GET" })
    await user.click(getCheckbox)

    const originInput = screen.getByPlaceholderText(/https:\/\/example.com or/i)
    await user.type(originInput, "https://test.com{Enter}")

    // Submit
    const submitButton = screen.getByRole("button", { name: /Create CORS Rule/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled()
    })
  })

  it("calls markSubmitted on form submission", async () => {
    const user = userEvent.setup()
    const mockMutate = vi.fn()

    ;(trpcReact.storage.ceph.cors.set.useMutation as any).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    })

    render(
      <CorsRuleModal
        isOpen={true}
        bucketName="test-bucket"
        editingIndex={null}
        onSuccess={mockOnSuccess}
        onError={mockOnError}
        onClose={mockOnClose}
      />,
      { wrapper: Wrapper }
    )

    // Fill in minimal required fields
    const getCheckbox = screen.getByRole("checkbox", { name: "GET" })
    await user.click(getCheckbox)

    const originInput = screen.getByPlaceholderText(/https:\/\/example.com or/i)
    await user.type(originInput, "https://test.com{Enter}")

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /Create CORS Rule/i })
    await user.click(submitButton)

    // Verify markSubmitted was called
    await waitFor(() => {
      expect(mockMarkSubmitted).toHaveBeenCalled()
    })
  })
})
