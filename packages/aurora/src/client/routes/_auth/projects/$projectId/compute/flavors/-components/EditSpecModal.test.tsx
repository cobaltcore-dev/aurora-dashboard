import { render, screen, act, waitFor, fireEvent } from "@testing-library/react"
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest"
import { EditSpecModal } from "./EditSpecModal"
import { TrpcClient } from "@/client/trpcClient"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"
import { Flavor } from "@/server/Compute/types/flavor"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("EditSpecModal", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const mockFlavor: Flavor = {
    id: "test-flavor-id",
    name: "Test Flavor",
    vcpus: 2,
    ram: 1024,
    disk: 10,
  }

  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls createExtraSpecs with correct payload when adding new property", async () => {
    const mockClient = {
      compute: {
        getExtraSpecs: {
          query: vi.fn().mockResolvedValue({}),
        },
        createExtraSpecs: {
          mutate: vi.fn().mockResolvedValue({ success: true }),
        },
        deleteExtraSpec: {
          mutate: vi.fn().mockResolvedValue({ success: true }),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    await waitFor(() => screen.getByRole("button", { name: /Add Property/i }))
    fireEvent.click(screen.getByRole("button", { name: /Add Property/i }))

    await waitFor(() => screen.getByPlaceholderText(/Property Key/i))

    const inputs = screen.getAllByRole("textbox")
    fireEvent.change(inputs[0], { target: { value: "hw:cpu_policy" } })
    fireEvent.change(inputs[1], { target: { value: "dedicated" } })

    const saveButton = screen.getByRole("button", { name: /Save/i })
    await act(async () => {
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(mockClient.compute.createExtraSpecs.mutate).toHaveBeenCalledWith({
        project_id: "test-project",
        flavorId: "test-flavor-id",
        extra_specs: { "hw:cpu_policy": "dedicated" },
      })
    })
  })

  it("calls deleteExtraSpec with correct payload when deleting property", async () => {
    const mockClient = {
      compute: {
        getExtraSpecs: {
          query: vi.fn().mockResolvedValue({ "hw:cpu_policy": "dedicated" }),
        },
        createExtraSpecs: {
          mutate: vi.fn().mockResolvedValue({ success: true }),
        },
        deleteExtraSpec: {
          mutate: vi.fn().mockResolvedValue({ success: true }),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    await waitFor(() => screen.getByTestId("delete-hw:cpu_policy"))

    await act(async () => {
      fireEvent.click(screen.getByTestId("delete-hw:cpu_policy"))
    })

    await waitFor(() => {
      expect(mockClient.compute.deleteExtraSpec.mutate).toHaveBeenCalledWith({
        project_id: "test-project",
        flavorId: "test-flavor-id",
        key: "hw:cpu_policy",
      })
    })
  })

  it("validates duplicate keys and shows error message", async () => {
    const mockClient = {
      compute: {
        getExtraSpecs: {
          query: vi.fn().mockResolvedValue({ "hw:cpu_policy": "dedicated" }),
        },
        createExtraSpecs: {
          mutate: vi.fn().mockResolvedValue({ success: true }),
        },
        deleteExtraSpec: {
          mutate: vi.fn().mockResolvedValue({ success: true }),
        },
      },
    } as unknown as TrpcClient

    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={mockOnClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    await waitFor(() => screen.getByRole("button", { name: /Add Property/i }))
    fireEvent.click(screen.getByRole("button", { name: /Add Property/i }))

    await waitFor(() => screen.getByPlaceholderText(/Property Key/i))

    const inputs = screen.getAllByRole("textbox")
    fireEvent.change(inputs[0], { target: { value: "hw:cpu_policy" } })
    fireEvent.change(inputs[1], { target: { value: "shared" } })

    const saveButton = screen.getByRole("button", { name: /Save/i })
    await act(async () => {
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(screen.getByText("A property with this key already exists")).toBeInTheDocument()
    })

    expect(mockClient.compute.createExtraSpecs.mutate).not.toHaveBeenCalled()
  })
})
