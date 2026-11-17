import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { SessionExpired } from "./SessionExpired"

const h = vi.hoisted(() => ({ restart: vi.fn() }))
vi.mock("@/client/utils/restartSignIn", () => ({ restartSignIn: h.restart }))
vi.mock("@/client/trpcClient", () => ({ trpcClient: { auth: {} } }))
beforeAll(() => {
  i18n.load("en", {})
  i18n.activate("en")
})
beforeEach(() => {
  vi.clearAllMocks()
})

describe("SessionExpired", () => {
  it("keeps the Session Expired title and restarts sign-in", () => {
    render(
      <I18nProvider i18n={i18n}>
        <SessionExpired />
      </I18nProvider>
    )
    expect(screen.getByText("Session Expired")).toBeInTheDocument()
    expect(screen.getByText("Redirecting to sign-in...")).toBeInTheDocument()
    expect(h.restart).toHaveBeenCalledTimes(1)
  })
})
