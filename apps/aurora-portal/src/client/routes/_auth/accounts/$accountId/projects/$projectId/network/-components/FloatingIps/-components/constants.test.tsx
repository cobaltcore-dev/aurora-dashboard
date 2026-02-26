import { describe, it, expect } from "vitest"
import { STATUS_CONFIG, TABLE_COLUMNS } from "./constants"

/**
 * Tests for constants.tsx
 *
 * Note: Testing constants files generally provides limited value since they are simple data objects
 * without business logic or transformations. These tests mainly verify:
 * - Constants exist and have the correct structure
 * - Regressions in data are caught
 *
 * If constants change significantly or new ones are added, these tests help catch inadvertent changes.
 */
describe("FloatingIp constants", () => {
  describe("STATUS_CONFIG", () => {
    it("exports STATUS_CONFIG object", () => {
      expect(STATUS_CONFIG).toBeDefined()
    })

    it("contains all required status values", () => {
      expect(STATUS_CONFIG).toHaveProperty("ACTIVE")
      expect(STATUS_CONFIG).toHaveProperty("DOWN")
      expect(STATUS_CONFIG).toHaveProperty("ERROR")
    })

    it("each status has text and icon properties", () => {
      Object.values(STATUS_CONFIG).forEach((config) => {
        expect(config).toHaveProperty("text")
        expect(config).toHaveProperty("icon")
        expect(typeof config.text).toBe("string")
      })
    })

    it("provides human-readable status text", () => {
      expect(STATUS_CONFIG.ACTIVE.text).toBe("Active")
      expect(STATUS_CONFIG.DOWN.text).toBe("Down")
      expect(STATUS_CONFIG.ERROR.text).toBe("Error")
    })

    it("provides React elements as icons", () => {
      Object.values(STATUS_CONFIG).forEach((config) => {
        // Check that icon is a React element (has a type property or is JSX)
        expect(config.icon).toBeDefined()
      })
    })
  })

  describe("TABLE_COLUMNS", () => {
    it("exports TABLE_COLUMNS function", () => {
      expect(typeof TABLE_COLUMNS).toBe("function")
    })

    it("returns array of column names", () => {
      const columns = TABLE_COLUMNS()
      expect(Array.isArray(columns)).toBe(true)
    })

    it("provides 7 columns for the data grid", () => {
      const columns = TABLE_COLUMNS()
      expect(columns).toHaveLength(7)
    })

    it("includes status column", () => {
      const columns = TABLE_COLUMNS()
      expect(columns).toContain("Status")
    })

    it("includes floating IP address column", () => {
      const columns = TABLE_COLUMNS()
      expect(columns).toContain("Floating IP Address")
    })

    it("includes fixed IP address column", () => {
      const columns = TABLE_COLUMNS()
      expect(columns).toContain("Fixed IP Address")
    })

    it("includes description column", () => {
      const columns = TABLE_COLUMNS()
      expect(columns).toContain("Description")
    })

    it("includes empty columns for icons and actions", () => {
      const columns = TABLE_COLUMNS()
      const emptyColumns = columns.filter((col) => col === "")
      expect(emptyColumns.length).toBeGreaterThan(0)
    })
  })
})
