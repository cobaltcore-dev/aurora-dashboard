import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vitest } from "vitest"
import App from "./App"

vitest.mock("../Identity/Authentication/AuthForm", () => {
  return {
    AuthForm: () => <div>Mocked AuthForm</div>,
  }
})

describe("App Component", () => {
  it("renders AppShellProvider and AppShell correctly", () => {
    render(<App />)
    expect(screen.getByText(/Welcome to Aurora Dashboard/i)).toBeInTheDocument()
  })
})
