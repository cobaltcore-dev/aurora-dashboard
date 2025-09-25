import { renderHook, act } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { useSpecForm } from "./useSpecForm"

describe("useSpecForm", () => {
  it("validates key correctly", () => {
    const existingKeys = ["cpu", "memory"]
    const { result } = renderHook(() => useSpecForm(existingKeys))

    act(() => {
      result.current.updateKey("")
    })

    act(() => {
      result.current.validate()
    })

    expect(result.current.errors.key).toBe("Key is required.")

    act(() => {
      result.current.updateKey("cpu")
    })

    act(() => {
      result.current.validate()
    })

    expect(result.current.errors.key).toBe("Key already exists.")

    act(() => {
      result.current.updateKey("newKey")
    })

    act(() => {
      result.current.validate()
    })

    expect(result.current.errors.key).toBeUndefined()
  })

  it("validates value correctly", () => {
    const { result } = renderHook(() => useSpecForm([]))

    act(() => {
      result.current.updateValue("")
    })

    act(() => {
      result.current.validate()
    })

    expect(result.current.errors.value).toBe("Value is required.")

    act(() => {
      result.current.updateValue("validValue")
    })

    act(() => {
      result.current.validate()
    })

    expect(result.current.errors.value).toBeUndefined()
  })

  it("trims values correctly", () => {
    const { result } = renderHook(() => useSpecForm([]))

    act(() => {
      result.current.updateKey("  key  ")
      result.current.updateValue("  value  ")
    })

    expect(result.current.trimmedKey).toBe("key")
    expect(result.current.trimmedValue).toBe("value")
  })

  it("resets form correctly", () => {
    const { result } = renderHook(() => useSpecForm([]))

    act(() => {
      result.current.updateKey("key")
      result.current.updateValue("value")
      result.current.validate()
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.key).toBe("")
    expect(result.current.value).toBe("")
    expect(result.current.errors).toEqual({})
  })

  it("clears errors when updating fields", () => {
    const { result } = renderHook(() => useSpecForm([]))

    act(() => {
      result.current.validate()
    })

    expect(result.current.errors.key).toBeDefined()
    expect(result.current.errors.value).toBeDefined()

    act(() => {
      result.current.updateKey("newKey")
    })

    expect(result.current.errors.key).toBeUndefined()

    act(() => {
      result.current.updateValue("newValue")
    })

    expect(result.current.errors.value).toBeUndefined()
  })
})
