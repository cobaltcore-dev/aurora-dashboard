import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useContext } from "react"
import { DynamicBreadcrumbProvider, DynamicBreadcrumbContext } from "@/client/context/DynamicBreadcrumbContext"
import { useSetBreadcrumb } from "./useSetBreadcrumb"

describe("useSetBreadcrumb", () => {
  it("registers the breadcrumb in context with the given text", async () => {
    const { result } = renderHook(
      () => {
        useSetBreadcrumb("/_auth/projects/$projectId/compute/images", "Images")
        return useContext(DynamicBreadcrumbContext).crumbs
      },
      { wrapper: DynamicBreadcrumbProvider }
    )

    await act(async () => {})

    expect(result.current.get("/_auth/projects/$projectId/compute/images")).toEqual({ text: "Images" })
  })
})
