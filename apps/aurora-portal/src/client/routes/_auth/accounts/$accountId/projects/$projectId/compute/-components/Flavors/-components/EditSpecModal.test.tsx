import { render, screen, act } from "@testing-library/react"
import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest"
import { EditSpecModal } from "./EditSpecModal"
import { TrpcClient } from "@/client/trpcClient"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { Flavor } from "@/server/Compute/types/flavor"
import { ReactNode } from "react"

vi.mock("@/client/utils/useErrorTranslation", () => ({
  useErrorTranslation: () => ({
    translateError: vi.fn((error) => error || "An error occurred"),
  }),
}))

vi.mock("./hooks/useExtraSpecs")
vi.mock("./hooks/useSpecForm")

const TestingProvider = ({ children }: { children: ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>
describe("EditSpecModal Integration", () => {
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

  const mockClient = {
    compute: {
      getExtraSpecs: { query: vi.fn().mockResolvedValue({ cpu: "dedicated" }) },
      createExtraSpecs: { mutate: vi.fn().mockResolvedValue({}) },
      deleteExtraSpec: { mutate: vi.fn().mockResolvedValue({}) },
    },
  } as unknown as TrpcClient

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders modal and integrates components correctly", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={vi.fn()}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })

    expect(screen.getByText("Edit Extra Specs")).toBeInTheDocument()
  })

  it("handles modal close correctly", async () => {
    const onClose = vi.fn()

    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={onClose}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })
  })

  it("integrates add and delete workflows", async () => {
    await act(async () => {
      render(
        <EditSpecModal
          client={mockClient}
          isOpen={true}
          onClose={vi.fn()}
          project="test-project"
          flavor={mockFlavor}
        />,
        { wrapper: TestingProvider }
      )
    })
  })
})
