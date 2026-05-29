import { describe, it, expect } from "vitest"
import { formatBytes, formatBytesDecimal, formatBytesBinary } from "./formatBytes"

describe("formatBytes", () => {
  // ─── Null / zero / falsy inputs ────────────────────────────────────────────

  describe("null / zero / falsy inputs", () => {
    it("returns '0 B' for 0", () => {
      expect(formatBytes(0)).toBe("0 B")
    })

    it("returns '0 B' for null", () => {
      expect(formatBytes(null)).toBe("0 B")
    })

    it("returns '0 B' for undefined", () => {
      expect(formatBytes(undefined)).toBe("0 B")
    })
  })

  // ─── Default (binary / IEC) ─────────────────────────────────────────────────

  describe("binary mode (default)", () => {
    it("formats bytes below 1 KiB", () => {
      expect(formatBytes(1)).toBe("1 B")
      expect(formatBytes(500)).toBe("500 B")
      expect(formatBytes(1023)).toBe("1023 B")
    })

    it("formats exact KiB boundary", () => {
      expect(formatBytes(1024)).toBe("1 KiB")
    })

    it("formats fractional KiB", () => {
      // 1536 / 1024 = 1.5
      expect(formatBytes(1536)).toBe("1.5 KiB")
    })

    it("formats exact MiB boundary", () => {
      // 1024^2 = 1 048 576
      expect(formatBytes(1048576)).toBe("1 MiB")
    })

    it("formats exact GiB boundary", () => {
      // 1024^3 = 1 073 741 824
      expect(formatBytes(1073741824)).toBe("1 GiB")
    })

    it("formats exact TiB boundary", () => {
      // 1024^4 = 1 099 511 627 776
      expect(formatBytes(1099511627776)).toBe("1 TiB")
    })

    it("formats exact PiB boundary", () => {
      // 1024^5 = 1 125 899 906 842 624
      expect(formatBytes(1125899906842624)).toBe("1 PiB")
    })

    it("uses 'binary' unitSystem explicitly", () => {
      expect(formatBytes(1024, { unitSystem: "binary" })).toBe("1 KiB")
    })

    it("uses IEC labels (KiB, MiB, GiB, …), not SI labels", () => {
      expect(formatBytes(1024)).toContain("KiB")
      expect(formatBytes(1048576)).toContain("MiB")
      expect(formatBytes(1073741824)).toContain("GiB")
    })
  })

  // ─── Decimal (SI) mode ──────────────────────────────────────────────────────

  describe("decimal mode (SI)", () => {
    it("formats bytes below 1 KB", () => {
      expect(formatBytes(1, { unitSystem: "decimal" })).toBe("1 B")
      expect(formatBytes(500, { unitSystem: "decimal" })).toBe("500 B")
      expect(formatBytes(999, { unitSystem: "decimal" })).toBe("999 B")
    })

    it("formats exact KB boundary", () => {
      expect(formatBytes(1000, { unitSystem: "decimal" })).toBe("1 KB")
    })

    it("formats fractional KB", () => {
      // 1500 / 1000 = 1.5
      expect(formatBytes(1500, { unitSystem: "decimal" })).toBe("1.5 KB")
    })

    it("formats exact MB boundary", () => {
      expect(formatBytes(1000000, { unitSystem: "decimal" })).toBe("1 MB")
    })

    it("formats exact GB boundary", () => {
      expect(formatBytes(1000000000, { unitSystem: "decimal" })).toBe("1 GB")
    })

    it("formats exact TB boundary", () => {
      expect(formatBytes(1000000000000, { unitSystem: "decimal" })).toBe("1 TB")
    })

    it("formats exact PB boundary", () => {
      expect(formatBytes(1000000000000000, { unitSystem: "decimal" })).toBe("1 PB")
    })

    it("uses SI labels (KB, MB, GB, …), not IEC labels", () => {
      expect(formatBytes(1000, { unitSystem: "decimal" })).toContain("KB")
      expect(formatBytes(1000000, { unitSystem: "decimal" })).toContain("MB")
      expect(formatBytes(1000000000, { unitSystem: "decimal" })).toContain("GB")
    })

    it("binary and decimal differ for the same input", () => {
      // 1024 bytes = 1 KiB (binary) but 1.02 KB (decimal)
      expect(formatBytes(1024, { unitSystem: "binary" })).toBe("1 KiB")
      expect(formatBytes(1024, { unitSystem: "decimal" })).toBe("1.02 KB")
    })
  })

  // ─── Decimal places ─────────────────────────────────────────────────────────

  describe("decimals option", () => {
    it("defaults to 2 decimal places", () => {
      // 1234 / 1024 = 1.205... → 1.21 KiB
      expect(formatBytes(1234)).toBe("1.21 KiB")
    })

    it("respects decimals: 0 (rounds to integer)", () => {
      expect(formatBytes(1536, { decimals: 0 })).toBe("2 KiB")
      expect(formatBytes(1024, { decimals: 0 })).toBe("1 KiB")
    })

    it("respects decimals: 1", () => {
      // 1536 / 1024 = 1.5
      expect(formatBytes(1536, { decimals: 1 })).toBe("1.5 KiB")
    })

    it("respects decimals: 3", () => {
      // 1234 / 1024 = 1.205... → 1.205 KiB
      expect(formatBytes(1234, { decimals: 3 })).toBe("1.205 KiB")
    })

    it("treats negative decimals as 0", () => {
      expect(formatBytes(1024, { decimals: -1 })).toBe("1 KiB")
    })

    it("works with decimals in decimal mode", () => {
      expect(formatBytes(1234567890, { unitSystem: "decimal", decimals: 0 })).toBe("1 GB")
      expect(formatBytes(1234567890, { unitSystem: "decimal", decimals: 1 })).toBe("1.2 GB")
      expect(formatBytes(1234567890, { unitSystem: "decimal", decimals: 2 })).toBe("1.23 GB")
      expect(formatBytes(1234567890, { unitSystem: "decimal", decimals: 3 })).toBe("1.235 GB")
    })

    it("strips trailing zeros via parseFloat", () => {
      // 1 GiB exactly: 1.00 → parseFloat strips to 1
      expect(formatBytes(1073741824)).toBe("1 GiB")
      // 1.50 KiB → "1.5 KiB"
      expect(formatBytes(1536)).toBe("1.5 KiB")
    })
  })

  // ─── Combined options ───────────────────────────────────────────────────────

  describe("combined unitSystem + decimals", () => {
    it("decimal mode with 0 decimals", () => {
      expect(formatBytes(1500000000, { unitSystem: "decimal", decimals: 0 })).toBe("2 GB")
    })

    it("binary mode with 3 decimals", () => {
      // 1073741824 / 1024^3 = 1.000 GiB
      expect(formatBytes(1073741824, { unitSystem: "binary", decimals: 3 })).toBe("1 GiB")
    })
  })
})

// ─── formatBytesDecimal ───────────────────────────────────────────────────────

describe("formatBytesDecimal", () => {
  it("is a convenience wrapper for decimal mode", () => {
    expect(formatBytesDecimal(1000)).toBe(formatBytes(1000, { unitSystem: "decimal" }))
    expect(formatBytesDecimal(1000000)).toBe(formatBytes(1000000, { unitSystem: "decimal" }))
  })

  it("returns '0 B' for 0", () => {
    expect(formatBytesDecimal(0)).toBe("0 B")
  })

  it("returns '0 B' for null", () => {
    expect(formatBytesDecimal(null)).toBe("0 B")
  })

  it("returns '0 B' for undefined", () => {
    expect(formatBytesDecimal(undefined)).toBe("0 B")
  })

  it("uses SI labels", () => {
    expect(formatBytesDecimal(1000)).toBe("1 KB")
    expect(formatBytesDecimal(1000000)).toBe("1 MB")
    expect(formatBytesDecimal(1000000000)).toBe("1 GB")
    expect(formatBytesDecimal(1000000000000)).toBe("1 TB")
  })

  it("formats with default 2 decimal places", () => {
    // 1234 / 1000 = 1.23 KB
    expect(formatBytesDecimal(1234)).toBe("1.23 KB")
  })

  it("forwards the decimals parameter", () => {
    expect(formatBytesDecimal(1234, 0)).toBe("1 KB")
    expect(formatBytesDecimal(1234, 1)).toBe("1.2 KB")
    expect(formatBytesDecimal(1234, 3)).toBe("1.234 KB")
  })

  it("never returns IEC labels", () => {
    expect(formatBytesDecimal(1024)).not.toContain("KiB")
    expect(formatBytesDecimal(1048576)).not.toContain("MiB")
  })
})

// ─── formatBytesBinary ───────────────────────────────────────────────────────

describe("formatBytesBinary", () => {
  it("is a convenience wrapper for binary mode", () => {
    expect(formatBytesBinary(1024)).toBe(formatBytes(1024, { unitSystem: "binary" }))
    expect(formatBytesBinary(1048576)).toBe(formatBytes(1048576, { unitSystem: "binary" }))
  })

  it("returns '0 B' for 0", () => {
    expect(formatBytesBinary(0)).toBe("0 B")
  })

  it("returns '0 B' for null", () => {
    expect(formatBytesBinary(null)).toBe("0 B")
  })

  it("returns '0 B' for undefined", () => {
    expect(formatBytesBinary(undefined)).toBe("0 B")
  })

  it("uses IEC labels", () => {
    expect(formatBytesBinary(1024)).toBe("1 KiB")
    expect(formatBytesBinary(1048576)).toBe("1 MiB")
    expect(formatBytesBinary(1073741824)).toBe("1 GiB")
    expect(formatBytesBinary(1099511627776)).toBe("1 TiB")
  })

  it("formats with default 2 decimal places", () => {
    // 1234 / 1024 = 1.205... → 1.21 KiB
    expect(formatBytesBinary(1234)).toBe("1.21 KiB")
  })

  it("forwards the decimals parameter", () => {
    expect(formatBytesBinary(1536, 0)).toBe("2 KiB")
    expect(formatBytesBinary(1536, 1)).toBe("1.5 KiB")
    expect(formatBytesBinary(1536, 3)).toBe("1.5 KiB")
  })

  it("never returns SI labels", () => {
    expect(formatBytesBinary(1000)).not.toContain("KB")
    expect(formatBytesBinary(1000000)).not.toContain("MB")
  })
})
