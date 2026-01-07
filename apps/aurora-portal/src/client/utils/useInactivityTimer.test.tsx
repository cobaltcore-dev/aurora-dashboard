import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useInactivityTimer } from "./useInactivityTimer"

describe("useInactivityTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("should call onInactive after timeout", async () => {
    const onInactive = vi.fn()
    const timeout = 5000

    renderHook(() =>
      useInactivityTimer({
        timeout,
        onInactive,
        enabled: true,
      })
    )

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(timeout)
    })

    expect(onInactive).toHaveBeenCalledTimes(1)
  })

  it("should not call onInactive before timeout", () => {
    const onInactive = vi.fn()
    const timeout = 5000

    renderHook(() =>
      useInactivityTimer({
        timeout,
        onInactive,
        enabled: true,
      })
    )

    act(() => {
      vi.advanceTimersByTime(timeout - 1000)
    })

    expect(onInactive).not.toHaveBeenCalled()
  })

  it("should reset timer on user activity", () => {
    const onInactive = vi.fn()
    const timeout = 5000

    renderHook(() =>
      useInactivityTimer({
        timeout,
        onInactive,
        enabled: true,
      })
    )

    // Advance time halfway
    act(() => {
      vi.advanceTimersByTime(timeout / 2)
    })

    // Simulate user activity
    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown"))
    })

    // Advance time by another half (should not trigger yet)
    act(() => {
      vi.advanceTimersByTime(timeout / 2)
    })

    expect(onInactive).not.toHaveBeenCalled()

    // Now advance to full timeout from last activity
    act(() => {
      vi.advanceTimersByTime(timeout / 2)
    })

    expect(onInactive).toHaveBeenCalledTimes(1)
  })

  it("should listen to multiple event types", () => {
    const onInactive = vi.fn()
    const timeout = 5000
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]

    renderHook(() =>
      useInactivityTimer({
        timeout,
        onInactive,
        enabled: true,
      })
    )

    events.forEach((eventType) => {
      act(() => {
        vi.advanceTimersByTime(timeout / 2)
        document.dispatchEvent(new Event(eventType))
      })
    })

    // Should not have been called yet
    expect(onInactive).not.toHaveBeenCalled()
  })

  it("should not start timer when disabled", () => {
    const onInactive = vi.fn()
    const timeout = 5000

    renderHook(() =>
      useInactivityTimer({
        timeout,
        onInactive,
        enabled: false,
      })
    )

    act(() => {
      vi.advanceTimersByTime(timeout)
    })

    expect(onInactive).not.toHaveBeenCalled()
  })

  it("should stop timer when disabled after being enabled", () => {
    const onInactive = vi.fn()
    const timeout = 5000

    const { rerender } = renderHook(
      ({ enabled }) =>
        useInactivityTimer({
          timeout,
          onInactive,
          enabled,
        }),
      { initialProps: { enabled: true } }
    )

    act(() => {
      vi.advanceTimersByTime(timeout / 2)
    })

    // Disable the timer
    rerender({ enabled: false })

    act(() => {
      vi.advanceTimersByTime(timeout)
    })

    expect(onInactive).not.toHaveBeenCalled()
  })

  it("should cleanup event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener")
    const onInactive = vi.fn()

    const { unmount } = renderHook(() =>
      useInactivityTimer({
        timeout: 5000,
        onInactive,
        enabled: true,
      })
    )

    unmount()

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]
    events.forEach((event) => {
      expect(removeEventListenerSpy).toHaveBeenCalledWith(event, expect.any(Function), true)
    })
  })

  it("should update onInactive callback without resetting timer", () => {
    const onInactive1 = vi.fn()
    const onInactive2 = vi.fn()
    const timeout = 5000

    const { rerender } = renderHook(
      ({ callback }) =>
        useInactivityTimer({
          timeout,
          onInactive: callback,
          enabled: true,
        }),
      { initialProps: { callback: onInactive1 } }
    )

    act(() => {
      vi.advanceTimersByTime(timeout / 2)
    })

    // Change callback
    rerender({ callback: onInactive2 })

    act(() => {
      vi.advanceTimersByTime(timeout / 2)
    })

    // Should call the NEW callback
    expect(onInactive1).not.toHaveBeenCalled()
    expect(onInactive2).toHaveBeenCalledTimes(1)
  })
})
