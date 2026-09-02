import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useContext } from "react"
import { BreadcrumbExtensionProvider, BreadcrumbExtensionContext } from "@/client/context/BreadcrumbExtensionContext"
import { usePushBreadcrumbs } from "./usePushBreadcrumbs"

describe("usePushBreadcrumbs", () => {
  it("pushes breadcrumbs into context", async () => {
    const crumbs = [
      { label: "My Service", active: false },
      { label: "Detail Page", active: true },
    ]

    const { result } = renderHook(
      () => {
        usePushBreadcrumbs(crumbs)
        return useContext(BreadcrumbExtensionContext).breadcrumbs
      },
      { wrapper: BreadcrumbExtensionProvider }
    )

    await act(async () => {})

    expect(result.current).toEqual(crumbs)
  })
})
