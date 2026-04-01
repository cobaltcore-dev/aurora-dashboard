import { describe, it, expect } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useModal } from "./useModal"

describe("useModal", () => {
  describe("initial state", () => {
    it("should have open set to false by default", () => {
      const { result } = renderHook(() => useModal())
      const [open] = result.current

      expect(open).toBe(false)
    })

    it("should accept custom initial state", () => {
      const { result } = renderHook(() => useModal(true))
      const [open] = result.current

      expect(open).toBe(true)
    })

    it("should return an array with [open, toggleOpen]", () => {
      const { result } = renderHook(() => useModal())
      const [open, toggleOpen] = result.current

      expect(typeof open).toBe("boolean")
      expect(typeof toggleOpen).toBe("function")
    })
  })

  describe("toggle", () => {
    it("should toggle open state from false to true", () => {
      const { result } = renderHook(() => useModal())
      let open = result.current[0]
      const toggleOpen = result.current[1]

      expect(open).toBe(false)

      act(() => {
        toggleOpen()
      })
      ;[open] = result.current
      expect(open).toBe(true)
    })

    it("should toggle open state from true to false", () => {
      const { result } = renderHook(() => useModal())
      let open = result.current[0]
      const toggleOpen = result.current[1]

      expect(open).toBe(false)

      act(() => {
        toggleOpen()
      })
      ;[open] = result.current
      expect(open).toBe(true)

      act(() => {
        toggleOpen()
      })
      ;[open] = result.current
      expect(open).toBe(false)
    })

    it("should toggle multiple times correctly", () => {
      const { result } = renderHook(() => useModal())

      // Toggle 1: false -> true
      act(() => {
        result.current[1]()
      })
      expect(result.current[0]).toBe(true)

      // Toggle 2: true -> false
      act(() => {
        result.current[1]()
      })
      expect(result.current[0]).toBe(false)

      // Toggle 3: false -> true
      act(() => {
        result.current[1]()
      })
      expect(result.current[0]).toBe(true)
    })

    it("should toggle correctly when initialized with true", () => {
      const { result } = renderHook(() => useModal(true))
      let open = result.current[0]
      const toggleOpen = result.current[1]

      expect(open).toBe(true)

      act(() => {
        toggleOpen()
      })
      ;[open] = result.current
      expect(open).toBe(false)

      act(() => {
        toggleOpen()
      })
      ;[open] = result.current
      expect(open).toBe(true)
    })
  })

  describe("function memoization", () => {
    it("should maintain same toggle reference across renders when dependencies are stable", () => {
      const { result, rerender } = renderHook(() => useModal())

      const firstToggle = result.current[1]

      rerender()

      const secondToggle = result.current[1]

      expect(firstToggle).toBe(secondToggle)
    })

    it("should call toggle without errors", () => {
      const { result } = renderHook(() => useModal())

      expect(() => {
        act(() => {
          result.current[1]()
        })
      }).not.toThrow()
    })
  })

  describe("state updates", () => {
    it("should update state correctly after multiple rapid toggles", () => {
      const { result } = renderHook(() => useModal())

      act(() => {
        result.current[1]()
        result.current[1]()
        result.current[1]()
      })

      expect(result.current[0]).toBe(true)
    })

    it("should maintain state independently across multiple hook instances", () => {
      const { result: result1 } = renderHook(() => useModal())
      const { result: result2 } = renderHook(() => useModal())

      act(() => {
        result1.current[1]()
      })

      expect(result1.current[0]).toBe(true)
      expect(result2.current[0]).toBe(false)
    })
  })
})
