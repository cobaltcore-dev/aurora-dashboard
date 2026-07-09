import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { DetailsInfo } from "./DetailsInfo"

describe("DetailsInfo", () => {
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
      />
    )

    expect(screen.getByText("CA ID")).toBeInTheDocument()
    expect(screen.getByText("ca-1")).toBeInTheDocument()
    expect(screen.getByText("Duration/validity")).toBeInTheDocument()
    expect(screen.getByText("2 days")).toBeInTheDocument()
    expect(screen.getByText("Certificate cert-1")).toBeInTheDocument()
    expect(screen.getByText(/BEGIN CERTIFICATE/)).toBeInTheDocument()
  })

  it("renders an em dash when a basic info value is undefined", () => {
    render(
      <DetailsInfo
        basicInfo={[{ label: "Duration/validity", value: undefined }]}
        heading="Certificate cert-1"
        content=""
      />
    )

    expect(screen.getByText("Duration/validity")).toBeInTheDocument()
    expect(screen.getByText("—")).toBeInTheDocument()
  })
})
