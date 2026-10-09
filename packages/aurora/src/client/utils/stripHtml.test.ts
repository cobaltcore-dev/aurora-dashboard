import { describe, it, expect } from "vitest"
import { stripHtml } from "./stripHtml"

describe("stripHtml", () => {
  it("should strip <br> tags and replace with space", () => {
    expect(stripHtml("Line 1<br>Line 2")).toBe("Line 1 Line 2")
    expect(stripHtml("Line 1<br/>Line 2")).toBe("Line 1 Line 2")
    expect(stripHtml("Line 1<BR>Line 2")).toBe("Line 1 Line 2")
  })

  it("should strip all HTML tags", () => {
    expect(stripHtml("<p>Hello</p>")).toBe("Hello")
    expect(stripHtml("<div><span>Test</span></div>")).toBe("Test")
    expect(stripHtml("<strong>Bold</strong> text")).toBe("Bold text")
  })

  it("should normalize multiple spaces", () => {
    expect(stripHtml("Multiple   spaces")).toBe("Multiple spaces")
    expect(stripHtml("Tab\t\tspaces")).toBe("Tab spaces")
  })

  it("should trim leading and trailing whitespace", () => {
    expect(stripHtml("  Hello  ")).toBe("Hello")
    expect(stripHtml("\n\nTest\n\n")).toBe("Test")
  })

  it("should handle complex HTML with line breaks", () => {
    const html = "Error occurred<br><br>Please try again<br>Contact support"
    expect(stripHtml(html)).toBe("Error occurred Please try again Contact support")
  })

  it("should handle empty string", () => {
    expect(stripHtml("")).toBe("")
  })

  it("should handle plain text without HTML", () => {
    expect(stripHtml("Plain text message")).toBe("Plain text message")
  })

  it("should handle self-closing tags", () => {
    expect(stripHtml("Image: <img src='test.png' /> here")).toBe("Image: here")
    expect(stripHtml("Break<br/>here")).toBe("Break here")
  })
})
