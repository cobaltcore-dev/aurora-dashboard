import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ParsedCertificateInfo } from "./ParsedCertificateInfo"
import { parseCsrInfo } from "./parseCsrInfo"

vi.mock("./parseCsrInfo", () => ({
  parseCsrInfo: vi.fn(),
}))

const renderComponent = (csrCode: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ParsedCertificateInfo csrCode={csrCode} />
    </QueryClientProvider>
  )
}

describe("ParsedCertificateInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not parse or render anything for empty input", () => {
    renderComponent("")

    expect(parseCsrInfo).not.toHaveBeenCalled()
    expect(screen.queryByRole("term")).not.toBeInTheDocument()
  })

  it("renders parsed certificate fields", async () => {
    vi.mocked(parseCsrInfo).mockResolvedValue([
      { label: "Subject", value: "CN=test.example.com" },
      { label: "Public Key Algorithm", value: "RSA 2048-bit" },
    ])

    renderComponent("-----BEGIN CERTIFICATE REQUEST-----mock-----END CERTIFICATE REQUEST-----")

    await waitFor(() => {
      expect(parseCsrInfo).toHaveBeenCalledWith(
        "-----BEGIN CERTIFICATE REQUEST-----mock-----END CERTIFICATE REQUEST-----"
      )
    })

    expect(await screen.findByText("Subject")).toBeInTheDocument()
    expect(screen.getByText("CN=test.example.com")).toBeInTheDocument()
    expect(screen.getByText("Public Key Algorithm")).toBeInTheDocument()
    expect(screen.getByText("RSA 2048-bit")).toBeInTheDocument()
  })

  it("renders nothing when parsing fails", async () => {
    vi.mocked(parseCsrInfo).mockRejectedValue(new Error("invalid csr"))

    renderComponent("invalid")

    await waitFor(() => {
      expect(parseCsrInfo).toHaveBeenCalledWith("invalid")
    })

    await waitFor(() => {
      expect(screen.queryByText("Subject")).not.toBeInTheDocument()
    })
  })
})
