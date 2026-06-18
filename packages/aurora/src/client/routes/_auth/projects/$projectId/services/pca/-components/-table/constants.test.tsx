import { describe, expect, it } from "vitest"
import { STATE_CONFIG, TABLE_COLUMNS } from "./constants"

describe("PCA table constants", () => {
  it("returns stable table columns in order", () => {
    expect(TABLE_COLUMNS()).toEqual(["State", "ID", "Subject information", ""])
  })

  it("maps specific states to expected labels", () => {
    expect(STATE_CONFIG.CREATING.text).toBe("Creating")
    expect(STATE_CONFIG.AWAITING_CERTIFICATE.text).toBe("Awaiting Certificate")
  })

  it("provides icons for configured states", () => {
    expect(STATE_CONFIG.CREATING.icon).toBeDefined()
    expect(STATE_CONFIG.AWAITING_CERTIFICATE.icon).toBeDefined()
  })
})
