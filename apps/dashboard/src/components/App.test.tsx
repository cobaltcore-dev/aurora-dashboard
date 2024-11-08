import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import App from "./App"

describe("App Component", () => {
  it("renders AppShellProvider and AppShell correctly", () => {
    render(<App />)

    const title = screen.getAllByText("Aurora Dashboard")

    // Check that the page header text is present
    expect(title?.[0]).toBeInTheDocument()
  })
})
