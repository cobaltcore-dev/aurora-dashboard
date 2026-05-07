import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { logger, redactSensitiveData } from "./logger"

describe("logger", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe("debug", () => {
    it("should log debug messages", () => {
      logger.debug("Test debug message")
      expect(consoleLogSpy).toHaveBeenCalled()
      const call = consoleLogSpy.mock.calls[0][0]
      expect(call).toContain("DEBUG")
      expect(call).toContain("[signal-openstack]")
      expect(call).toContain("Test debug message")
    })

    it("should log debug messages with data", () => {
      logger.debug("Test with data", { foo: "bar" })
      expect(consoleLogSpy).toHaveBeenCalledTimes(2) // Message + data
    })
  })

  describe("info", () => {
    it("should log info messages", () => {
      logger.info("Test info message")
      expect(consoleLogSpy).toHaveBeenCalled()
      const call = consoleLogSpy.mock.calls[0][0]
      expect(call).toContain("INFO")
      expect(call).toContain("Test info message")
    })
  })

  describe("warn", () => {
    it("should log warning messages", () => {
      logger.warn("Test warning message")
      expect(consoleWarnSpy).toHaveBeenCalled()
      const call = consoleWarnSpy.mock.calls[0][0]
      expect(call).toContain("WARN")
      expect(call).toContain("Test warning message")
    })
  })

  describe("error", () => {
    it("should log error messages", () => {
      logger.error("Test error message")
      expect(consoleErrorSpy).toHaveBeenCalled()
      const call = consoleErrorSpy.mock.calls[0][0]
      expect(call).toContain("ERROR")
      expect(call).toContain("Test error message")
    })
  })

  describe("success", () => {
    it("should log success messages", () => {
      logger.success("Test success message")
      expect(consoleLogSpy).toHaveBeenCalled()
      const call = consoleLogSpy.mock.calls[0][0]
      expect(call).toContain("SUCCESS")
      expect(call).toContain("Test success message")
    })
  })
})

describe("redactSensitiveData", () => {
  it("should redact password fields", () => {
    const data = { username: "user", password: "secret123" }
    const redacted = redactSensitiveData(data)
    expect(redacted.username).toBe("user")
    expect(redacted.password).toContain("REDACTED")
    expect(redacted.password).not.toBe("secret123")
  })

  it("should redact token fields", () => {
    const data = { id: "123", token: "abc123token", auth_token: "xyz789" }
    const redacted = redactSensitiveData(data)
    expect(redacted.id).toBe("123")
    expect(redacted.token).toContain("REDACTED")
    expect(redacted.auth_token).toContain("REDACTED")
  })

  it("should redact nested sensitive data", () => {
    const data = {
      user: {
        name: "John",
        credentials: {
          password: "secret",
          apiKey: "key123",
        },
      },
    }
    const redacted = redactSensitiveData(data)
    expect(redacted.user.name).toBe("John")
    expect(redacted.user.credentials.password).toContain("REDACTED")
    expect(redacted.user.credentials.apiKey).toContain("REDACTED")
  })

  it("should redact sensitive data in arrays", () => {
    const data = {
      users: [
        { name: "User1", password: "pass1" },
        { name: "User2", token: "token2" },
      ],
    }
    const redacted = redactSensitiveData(data)
    expect(redacted.users[0].name).toBe("User1")
    expect(redacted.users[0].password).toContain("REDACTED")
    expect(redacted.users[1].name).toBe("User2")
    expect(redacted.users[1].token).toContain("REDACTED")
  })

  it("should redact X-Auth-Token header", () => {
    const data = {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": "sensitive-token-value",
      },
    }
    const redacted = redactSensitiveData(data)
    expect(redacted.headers["Content-Type"]).toBe("application/json")
    expect(redacted.headers["X-Auth-Token"]).toContain("REDACTED")
  })

  it("should handle special types", () => {
    const data = {
      stream: new ReadableStream(),
      formData: new FormData(),
      signal: new AbortController().signal,
    }
    const redacted = redactSensitiveData(data)
    expect(redacted.stream).toBe("[ReadableStream]")
    expect(redacted.formData).toBe("[FormData]")
    expect(redacted.signal).toBe("[AbortSignal]")
  })

  it("should handle primitives", () => {
    expect(redactSensitiveData(null)).toBe(null)
    expect(redactSensitiveData(undefined)).toBe(undefined)
    expect(redactSensitiveData(42)).toBe(42)
    expect(redactSensitiveData("string")).toBe("string")
    expect(redactSensitiveData(true)).toBe(true)
  })

  it("should show length hint for redacted strings", () => {
    const data = { password: "verylongpassword" }
    const redacted = redactSensitiveData(data)
    expect(redacted.password).toContain("16 chars")
  })

  it("should handle empty sensitive strings", () => {
    const data = { password: "" }
    const redacted = redactSensitiveData(data)
    expect(redacted.password).toBe("[REDACTED]")
  })

  it("should redact case-insensitive sensitive keys", () => {
    const data = {
      PASSWORD: "secret1",
      Token: "secret2",
      SECRET: "secret3",
      ApiKey: "secret4",
    }
    const redacted = redactSensitiveData(data)
    expect(redacted.PASSWORD).toContain("REDACTED")
    expect(redacted.Token).toContain("REDACTED")
    expect(redacted.SECRET).toContain("REDACTED")
    expect(redacted.ApiKey).toContain("REDACTED")
  })

  it("should handle dates and regex", () => {
    const date = new Date("2024-01-01")
    const regex = /test/
    const data = { date, regex, normal: "value" }
    const redacted = redactSensitiveData(data)
    expect(redacted.date).toBeInstanceOf(Date)
    expect(redacted.regex).toBeInstanceOf(RegExp)
    expect(redacted.normal).toBe("value")
  })
})
