import { detectLanguage } from "./languageDetection"

describe("languageDetection", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset navigator.languages to default
    Object.defineProperty(window.navigator, "languages", {
      writable: true,
      configurable: true,
      value: ["en-US"],
    })
  })

  it("should return default when no preference exists", () => {
    expect(detectLanguage()).toBe("en")
  })

  it("should return saved preference over browser language", () => {
    localStorage.setItem("aurora-locale", "de")
    expect(detectLanguage()).toBe("de")
  })

  it("should handle invalid saved locale gracefully", () => {
    localStorage.setItem("aurora-locale", "invalid")
    expect(detectLanguage()).toBe("en")
  })

  it("should extract language code correctly from browser settings", () => {
    // Mock browser language to German
    Object.defineProperty(window.navigator, "languages", {
      writable: true,
      configurable: true,
      value: ["de-DE", "de"],
    })
    expect(detectLanguage()).toBe("de")
  })

  it("should prioritize saved preference over browser language", () => {
    Object.defineProperty(window.navigator, "languages", {
      writable: true,
      configurable: true,
      value: ["de-DE"],
    })
    localStorage.setItem("aurora-locale", "en")
    expect(detectLanguage()).toBe("en") // Saved preference wins
  })
})
