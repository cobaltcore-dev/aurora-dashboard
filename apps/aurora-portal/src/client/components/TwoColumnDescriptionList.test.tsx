import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TwoColumnDescriptionList } from "./TwoColumnDescriptionList"

describe("TwoColumnDescriptionList", () => {
  const items = [
    { label: "Name", value: "my-float" },
    { label: "Status", value: "ACTIVE" },
    { label: "IP Address", value: "10.0.0.1" },
    { label: "Region", value: "eu-de-1" },
  ]

  it("renders all labels", () => {
    render(<TwoColumnDescriptionList items={items} />)
    for (const { label } of items) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it("renders all values", () => {
    render(<TwoColumnDescriptionList items={items} />)
    for (const { value } of items) {
      expect(screen.getByText(value)).toBeInTheDocument()
    }
  })

  it("splits items evenly across two columns", () => {
    const { container } = render(<TwoColumnDescriptionList items={items} />)
    const lists = container.querySelectorAll("dl")
    expect(lists).toHaveLength(2)
  })

  it("renders a single item in the first column", () => {
    render(<TwoColumnDescriptionList items={[{ label: "ID", value: "abc-123" }]} />)
    expect(screen.getByText("ID")).toBeInTheDocument()
    expect(screen.getByText("abc-123")).toBeInTheDocument()
  })

  it("renders an empty list without errors", () => {
    const { container } = render(<TwoColumnDescriptionList items={[]} />)
    expect(container).toBeTruthy()
  })
})
