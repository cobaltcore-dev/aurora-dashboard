import { render, screen, act, fireEvent } from "@testing-library/react"
import { describe, it, expect, beforeAll } from "vitest"
import { CreateFlavorModal } from "./CreateFlavorModal"
import { TrpcClient } from "@/client/trpcClient"
import { I18nProvider } from "@lingui/react"
import { ReactNode } from "react"
import { i18n } from "@lingui/core"

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("CreateFlavorModal", () => {
  beforeAll(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  const mockClient = {
    compute: {
      createFlavor: {
        mutate: vi.fn().mockResolvedValue({}),
      },
    },
  } as unknown as TrpcClient

  it("renders the modal ", async () => {
    await act(async () => {
      render(
        <CreateFlavorModal
          client={mockClient}
          isOpen={true}
          onClose={vi.fn()}
          project="test-project"
          onSuccess={vi.fn()}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    expect(screen.getByLabelText("Flavor ID")).toBeInTheDocument()
    expect(screen.getByLabelText("Flavor Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Description")).toBeInTheDocument()
    expect(screen.getByLabelText("VCPUs")).toBeInTheDocument()
    expect(screen.getByLabelText("RAM (MiB)")).toBeInTheDocument()
    expect(screen.getByLabelText("Disk (GiB)")).toBeInTheDocument()
    expect(screen.getByLabelText("Ephemeral Disk (GiB)")).toBeInTheDocument()
    expect(screen.getByLabelText("Swap (MiB)")).toBeInTheDocument()
    expect(screen.getByLabelText("RX/TX Factor")).toBeInTheDocument()
  })

  it("submits the form with changed values and defaults and calls createFlavor", async () => {
    await act(async () => {
      render(
        <CreateFlavorModal
          client={mockClient}
          isOpen={true}
          onClose={vi.fn()}
          project="test-project"
          onSuccess={vi.fn()}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    fireEvent.change(screen.getByLabelText("Flavor ID"), { target: { value: "TestFlavor" } })
    fireEvent.change(screen.getByLabelText("Flavor Name"), { target: { value: "TestFlavor" } })
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "A test flavor" } })
    fireEvent.change(screen.getByLabelText("VCPUs"), { target: { value: "4" } })
    fireEvent.change(screen.getByLabelText("RAM (MiB)"), { target: { value: "2048" } })
    fireEvent.change(screen.getByLabelText("Disk (GiB)"), { target: { value: "20" } })

    const submitButton = screen.getByText(/Create New Flavor/i)

    await act(async () => {
      fireEvent.click(submitButton)
    })

    expect(mockClient.compute.createFlavor.mutate).toHaveBeenCalledWith({
      projectId: "test-project",
      flavor: {
        id: "TestFlavor",
        name: "TestFlavor",
        description: "A test flavor",
        vcpus: 4,
        ram: 2048,
        disk: 20,
        // default values:
        rxtx_factor: 1,
        "OS-FLV-EXT-DATA:ephemeral": 0,
        swap: 0,
      },
    })
  })

  it("displays error messages on invalid input", async () => {
    await act(async () => {
      render(
        <CreateFlavorModal
          client={mockClient}
          isOpen={true}
          onClose={vi.fn()}
          project="test-project"
          onSuccess={vi.fn()}
        />,
        {
          wrapper: TestingProvider,
        }
      )
    })

    fireEvent.change(screen.getByLabelText("Flavor Name"), { target: { value: "T" } })
    fireEvent.blur(screen.getByLabelText("Flavor Name"))

    expect(screen.getByText("Name must be 2-50 characters long.")).toBeInTheDocument()
  })
})
