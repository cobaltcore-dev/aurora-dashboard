import { describe, it, expect, vi } from "vitest"
import {
  getContainerCreatedToast,
  getContainerCreateErrorToast,
  getContainerEmptiedToast,
  getContainerEmptyErrorToast,
  getContainerDeletedToast,
  getContainerDeleteErrorToast,
} from "./ContainerToastNotifications"

describe("getContainerCreatedToast", () => {
  it("returns correct title", () => {
    const toast = getContainerCreatedToast("my-container")
    expect(toast.title).toBe("Container Created")
  })

  it("returns correct text with container name", () => {
    const toast = getContainerCreatedToast("my-container")
    expect(toast.text).toBe('Container "my-container" was successfully created.')
  })

  it("returns success variant", () => {
    const toast = getContainerCreatedToast("my-container")
    expect(toast.variant).toBe("success")
  })

  it("returns autoDismiss true", () => {
    const toast = getContainerCreatedToast("my-container")
    expect(toast.autoDismiss).toBe(true)
  })

  it("returns autoDismissTimeout of 5000ms", () => {
    const toast = getContainerCreatedToast("my-container")
    expect(toast.autoDismissTimeout).toBe(5000)
  })

  it("applies onDismiss option when provided", () => {
    const onDismiss = vi.fn()
    const toast = getContainerCreatedToast("my-container", { onDismiss })
    expect(toast.onDismiss).toBe(onDismiss)
  })

  it("works without options", () => {
    expect(() => getContainerCreatedToast("my-container")).not.toThrow()
  })

  it("interpolates container name with special characters", () => {
    const toast = getContainerCreatedToast("my-container/with.special_chars")
    expect(toast.text).toBe('Container "my-container/with.special_chars" was successfully created.')
  })
})

describe("getContainerCreateErrorToast", () => {
  it("returns correct title", () => {
    const toast = getContainerCreateErrorToast("my-container", "Conflict")
    expect(toast.title).toBe("Failed to Create Container")
  })

  it("returns correct text with container name and error message", () => {
    const toast = getContainerCreateErrorToast("my-container", "Conflict")
    expect(toast.text).toBe('Could not create container "my-container": Conflict')
  })

  it("returns error variant", () => {
    const toast = getContainerCreateErrorToast("my-container", "Conflict")
    expect(toast.variant).toBe("error")
  })

  it("returns autoDismiss false", () => {
    const toast = getContainerCreateErrorToast("my-container", "Conflict")
    expect(toast.autoDismiss).toBe(false)
  })

  it("applies onDismiss option when provided", () => {
    const onDismiss = vi.fn()
    const toast = getContainerCreateErrorToast("my-container", "Conflict", { onDismiss })
    expect(toast.onDismiss).toBe(onDismiss)
  })

  it("works without options", () => {
    expect(() => getContainerCreateErrorToast("my-container", "Conflict")).not.toThrow()
  })

  it("interpolates container name with special characters", () => {
    const toast = getContainerCreateErrorToast("my-container/special", "Not Found")
    expect(toast.text).toBe('Could not create container "my-container/special": Not Found')
  })

  it("includes full error message in text", () => {
    const errorMessage = "Container name already exists in this account"
    const toast = getContainerCreateErrorToast("my-container", errorMessage)
    expect(toast.text).toContain(errorMessage)
  })
})

describe("getContainerEmptiedToast", () => {
  it("returns correct title", () => {
    const toast = getContainerEmptiedToast("my-container", 5)
    expect(toast.title).toBe("Container Emptied")
  })

  it("returns text with deleted count when objects were deleted", () => {
    const toast = getContainerEmptiedToast("my-container", 5)
    expect(toast.text).toBe('Container "my-container" was successfully emptied. 5 objects deleted.')
  })

  it("uses singular 'object' when deletedCount is 1", () => {
    const toast = getContainerEmptiedToast("my-container", 1)
    expect(toast.text).toBe('Container "my-container" was successfully emptied. 1 object deleted.')
  })

  it("returns already empty text when deletedCount is 0", () => {
    const toast = getContainerEmptiedToast("my-container", 0)
    expect(toast.text).toBe('Container "my-container" was already empty.')
  })

  it("returns success variant", () => {
    const toast = getContainerEmptiedToast("my-container", 3)
    expect(toast.variant).toBe("success")
  })

  it("returns autoDismiss true", () => {
    const toast = getContainerEmptiedToast("my-container", 3)
    expect(toast.autoDismiss).toBe(true)
  })

  it("returns autoDismissTimeout of 5000ms", () => {
    const toast = getContainerEmptiedToast("my-container", 3)
    expect(toast.autoDismissTimeout).toBe(5000)
  })

  it("applies onDismiss option when provided", () => {
    const onDismiss = vi.fn()
    const toast = getContainerEmptiedToast("my-container", 3, { onDismiss })
    expect(toast.onDismiss).toBe(onDismiss)
  })

  it("works without options", () => {
    expect(() => getContainerEmptiedToast("my-container", 3)).not.toThrow()
  })
})

describe("getContainerEmptyErrorToast", () => {
  it("returns correct title", () => {
    const toast = getContainerEmptyErrorToast("my-container", "Internal Server Error")
    expect(toast.title).toBe("Failed to Empty Container")
  })

  it("returns correct text with container name and error message", () => {
    const toast = getContainerEmptyErrorToast("my-container", "Internal Server Error")
    expect(toast.text).toBe('Could not empty container "my-container": Internal Server Error')
  })

  it("returns error variant", () => {
    const toast = getContainerEmptyErrorToast("my-container", "Internal Server Error")
    expect(toast.variant).toBe("error")
  })

  it("returns autoDismiss false", () => {
    const toast = getContainerEmptyErrorToast("my-container", "Internal Server Error")
    expect(toast.autoDismiss).toBe(false)
  })

  it("applies onDismiss option when provided", () => {
    const onDismiss = vi.fn()
    const toast = getContainerEmptyErrorToast("my-container", "Internal Server Error", { onDismiss })
    expect(toast.onDismiss).toBe(onDismiss)
  })

  it("works without options", () => {
    expect(() => getContainerEmptyErrorToast("my-container", "Internal Server Error")).not.toThrow()
  })

  it("includes full error message in text", () => {
    const errorMessage = "Bulk delete operation failed with status 500"
    const toast = getContainerEmptyErrorToast("my-container", errorMessage)
    expect(toast.text).toContain(errorMessage)
  })
})

describe("getContainerDeletedToast", () => {
  it("returns correct title", () => {
    const toast = getContainerDeletedToast("my-container")
    expect(toast.title).toBe("Container Deleted")
  })

  it("returns correct text with container name", () => {
    const toast = getContainerDeletedToast("my-container")
    expect(toast.text).toBe('Container "my-container" was successfully deleted.')
  })

  it("returns success variant", () => {
    const toast = getContainerDeletedToast("my-container")
    expect(toast.variant).toBe("success")
  })

  it("returns autoDismiss true", () => {
    const toast = getContainerDeletedToast("my-container")
    expect(toast.autoDismiss).toBe(true)
  })

  it("returns autoDismissTimeout of 5000ms", () => {
    const toast = getContainerDeletedToast("my-container")
    expect(toast.autoDismissTimeout).toBe(5000)
  })

  it("applies onDismiss option when provided", () => {
    const onDismiss = vi.fn()
    const toast = getContainerDeletedToast("my-container", { onDismiss })
    expect(toast.onDismiss).toBe(onDismiss)
  })

  it("works without options", () => {
    expect(() => getContainerDeletedToast("my-container")).not.toThrow()
  })

  it("interpolates container name with special characters", () => {
    const toast = getContainerDeletedToast("my-container/with.special_chars")
    expect(toast.text).toBe('Container "my-container/with.special_chars" was successfully deleted.')
  })
})

describe("getContainerDeleteErrorToast", () => {
  it("returns correct title", () => {
    const toast = getContainerDeleteErrorToast("my-container", "Not Found")
    expect(toast.title).toBe("Failed to Delete Container")
  })

  it("returns correct text with container name and error message", () => {
    const toast = getContainerDeleteErrorToast("my-container", "Not Found")
    expect(toast.text).toBe('Could not delete container "my-container": Not Found')
  })

  it("returns error variant", () => {
    const toast = getContainerDeleteErrorToast("my-container", "Not Found")
    expect(toast.variant).toBe("error")
  })

  it("returns autoDismiss false", () => {
    const toast = getContainerDeleteErrorToast("my-container", "Not Found")
    expect(toast.autoDismiss).toBe(false)
  })

  it("applies onDismiss option when provided", () => {
    const onDismiss = vi.fn()
    const toast = getContainerDeleteErrorToast("my-container", "Not Found", { onDismiss })
    expect(toast.onDismiss).toBe(onDismiss)
  })

  it("works without options", () => {
    expect(() => getContainerDeleteErrorToast("my-container", "Not Found")).not.toThrow()
  })

  it("includes full error message in text", () => {
    const errorMessage = "Container not found or already deleted"
    const toast = getContainerDeleteErrorToast("my-container", errorMessage)
    expect(toast.text).toContain(errorMessage)
  })
})
