import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatusLabel } from "./StatusLabel"
import { EMPTY_VALUE } from "./TwoColumnDescriptionList"

describe("StatusLabel", () => {
  it.each(["active", "ACTIVE", "aCtIvE"])("styles %s without changing the raw text", (value) => {
    render(<StatusLabel value={value} />)
    expect(screen.getByText(value)).toHaveClass("inline-block", "lowercase", "first-letter:uppercase")
  })

  it("capitalizes only the first letter for multi-word states", () => {
    render(<StatusLabel value="PENDING DELETE" />)
    expect(screen.getByText("PENDING DELETE")).toHaveClass("lowercase", "first-letter:uppercase")
  })

  it.each(["", null, undefined])("shows the placeholder for %s", (value) => {
    render(<StatusLabel value={value} />)
    expect(screen.getByText(EMPTY_VALUE)).toBeInTheDocument()
  })
})
