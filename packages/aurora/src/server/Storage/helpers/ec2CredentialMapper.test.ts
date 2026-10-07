import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { toEc2Credential, toEc2CredentialWithSecret, type RawEc2Credential } from "./ec2CredentialMapper"

const raw = (blob: string): RawEc2Credential => ({
  id: "cred-1",
  user_id: "user-1",
  project_id: "project-1",
  blob,
})

const validBlob = JSON.stringify({ access: "9F3C1D2E", secret: "kPz8Xw==" })

describe("toEc2Credential", () => {
  it("maps a Keystone credential onto the public shape", () => {
    expect(toEc2Credential(raw(validBlob))).toEqual({
      id: "cred-1",
      access: "9F3C1D2E",
      user_id: "user-1",
      project_id: "project-1",
    })
  })

  it("drops the secret even though the blob carries it", () => {
    expect(toEc2Credential(raw(validBlob))).not.toHaveProperty("secret")
  })

  it("rejects a blob that is not JSON", () => {
    expect(() => toEc2Credential(raw("not json"))).toThrow(
      expect.objectContaining({
        code: "INTERNAL_SERVER_ERROR",
        message: expect.stringContaining("Failed to parse EC2 credential blob for credential cred-1"),
      })
    )
  })

  it.each(["null", "42", "[]"])("rejects %s, which parses but has no fields to read", (blob) => {
    // These used to reach the field reads: `null` threw a TypeError, the others produced
    // `undefined` and failed schema validation with the wrong error.
    expect(() => toEc2Credential(raw(blob))).toThrow(
      expect.objectContaining({ message: expect.stringContaining("Failed to parse EC2 credential blob") })
    )
  })

  it("rejects a blob with no access key", () => {
    expect(() => toEc2Credential(raw(JSON.stringify({ secret: "kPz8Xw==" })))).toThrow(
      expect.objectContaining({
        code: "INTERNAL_SERVER_ERROR",
        message: expect.stringContaining("Invalid EC2 credential format for credential cred-1"),
      })
    )
  })

  it("names only the credential id, never anything out of the blob", () => {
    try {
      toEc2Credential(raw(JSON.stringify({ secret: "kPz8Xw==" })))
      expect.unreachable("should have thrown")
    } catch (error) {
      expect((error as TRPCError).message).not.toContain("kPz8Xw==")
    }
  })
})

describe("toEc2CredentialWithSecret", () => {
  it("keeps the secret", () => {
    expect(toEc2CredentialWithSecret(raw(validBlob))).toEqual({
      id: "cred-1",
      access: "9F3C1D2E",
      secret: "kPz8Xw==",
      user_id: "user-1",
      project_id: "project-1",
    })
  })

  it("rejects a blob with an access key but no secret", () => {
    expect(() => toEc2CredentialWithSecret(raw(JSON.stringify({ access: "9F3C1D2E" })))).toThrow(
      expect.objectContaining({
        message: expect.stringContaining("Invalid EC2 credential format for credential cred-1"),
      })
    )
  })
})
