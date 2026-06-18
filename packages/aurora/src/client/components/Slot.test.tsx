import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, act } from "@testing-library/react"
import { Slot } from "./Slot"
import type { SlotProps } from "../AuroraApp"
import type { FC } from "react"

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useRouteContext: () => ({ trpcClient: {} }),
}))

vi.mock("../index.css?inline", () => ({ default: "" }))
vi.mock("@cloudoperators/juno-ui-components/juno-ui-components.css?inline", () => ({ default: "" }))

const TestWidget: FC<SlotProps> = ({ auroraContext }) => (
  <div data-testid="test-widget" data-has-client={String(!!auroraContext.client)} />
)

describe("Slot", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "attachShadow").mockImplementation(function (this: HTMLElement) {
      return this as unknown as ShadowRoot
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
  it("renders the provided component", async () => {
    let container!: HTMLElement
    await act(async () => {
      ;({ container } = render(<Slot component={TestWidget} />))
    })
    expect(container.querySelector("[data-testid='test-widget']")).toBeTruthy()
  })

  it("passes auroraContext.client to the component", async () => {
    let container!: HTMLElement
    await act(async () => {
      ;({ container } = render(<Slot component={TestWidget} />))
    })
    expect(container.querySelector("[data-testid='test-widget']")?.getAttribute("data-has-client")).toBe("true")
  })

  it("attaches a shadow root", async () => {
    await act(async () => {
      render(<Slot component={TestWidget} />)
    })
    expect(HTMLElement.prototype.attachShadow).toHaveBeenCalledWith({ mode: "open" })
  })

  it("renders the component without a shadow root when useShadowDOM is false", async () => {
    let container!: HTMLElement
    await act(async () => {
      ;({ container } = render(<Slot component={TestWidget} useShadowDOM={false} />))
    })
    expect(container.querySelector("[data-testid='test-widget']")).toBeTruthy()
    expect(HTMLElement.prototype.attachShadow).not.toHaveBeenCalled()
  })
})
