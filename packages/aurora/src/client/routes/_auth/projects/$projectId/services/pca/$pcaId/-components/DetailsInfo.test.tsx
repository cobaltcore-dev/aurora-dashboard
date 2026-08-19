import { afterEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { DetailsInfo } from "./DetailsInfo"

describe("DetailsInfo", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders readonly basic info entries and code block content", () => {
    const basicInfo = [
      { label: "CA ID", value: "ca-1" },
      { label: "Duration/validity", value: "2 days" },
    ] as const

    render(
      <DetailsInfo
        basicInfo={basicInfo}
        heading="Certificate cert-1"
        content={"-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----"}
        fileName="cert-1.pem"
      />
    )

    expect(screen.getByText("CA ID")).toBeInTheDocument()
    expect(screen.getByText("ca-1")).toBeInTheDocument()
    expect(screen.getByText("Duration/validity")).toBeInTheDocument()
    expect(screen.getByText("2 days")).toBeInTheDocument()
    expect(screen.getByText("Certificate cert-1")).toBeInTheDocument()
    expect(screen.getByText(/BEGIN CERTIFICATE/)).toBeInTheDocument()
  })

  it("downloads the displayed content as a PEM file", () => {
    const createObjectURL = vi.fn(() => "blob:certificate")
    const revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click")
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL })

    render(<DetailsInfo basicInfo={[]} heading="Certificate cert/1" content="PEM content" fileName="cert-1.pem" />)

    const downloadIcon = screen.getByTitle("Download PEM file")
    fireEvent.click(downloadIcon)

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(click.mock.instances[0]).toHaveProperty("download", "cert-1.pem")
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:certificate")
  })

  it("renders an em dash when a basic info value is undefined", () => {
    render(
      <DetailsInfo
        basicInfo={[{ label: "Duration/validity", value: undefined }]}
        heading="Certificate cert-1"
        content=""
        fileName="cert-1.pem"
      />
    )

    expect(screen.getByText("Duration/validity")).toBeInTheDocument()
    expect(screen.getByText("—")).toBeInTheDocument()
  })
})
