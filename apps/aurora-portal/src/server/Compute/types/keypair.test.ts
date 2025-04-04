import { describe, it, expect } from "vitest"
import { keypairSchema, keypairResponseSchema, keypairsResponseSchema, createKeypairSchema } from "./keypair"

describe("OpenStack Keypair Schema Validation", () => {
  const minimalValidKeypair = {
    name: "my-keypair",
  }

  const completeValidKeypair = {
    name: "my-keypair",
    public_key: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC3YcQDKFhQpqt7d...",
    fingerprint: "56:73:3a:21:52:6a:de:bb:30:22:69:97:96:da:70:c2",
    type: "ssh",
    user_id: "user-123456",
    created_at: "2025-03-15T10:00:00Z",
    deleted: false,
    deleted_at: null,
    updated_at: "2025-03-15T10:00:00Z",
    id: 12345,
  }

  const keypairWithPrivateKey = {
    ...completeValidKeypair,
    private_key: "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAx...",
  }

  it("should validate a minimal valid keypair", () => {
    const result = keypairSchema.safeParse(minimalValidKeypair)
    expect(result.success).toBe(true)
  })

  it("should validate a complete valid keypair", () => {
    const result = keypairSchema.safeParse(completeValidKeypair)
    expect(result.success).toBe(true)
  })

  it("should validate a keypair with private key", () => {
    const result = keypairSchema.safeParse(keypairWithPrivateKey)
    expect(result.success).toBe(true)
  })

  it("should reject a keypair without a name", () => {
    const invalidKeypair = { public_key: "some-key" }
    const result = keypairSchema.safeParse(invalidKeypair)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("name")
    }
  })

  it("should validate valid key types", () => {
    const validTypes = ["ssh", "x509", "some-future-type"]

    for (const type of validTypes) {
      const keypair = { ...minimalValidKeypair, type }
      const result = keypairSchema.safeParse(keypair)
      expect(result.success).toBe(true)
    }
  })

  it("should validate null for optional fields", () => {
    const keypair = {
      ...minimalValidKeypair,
      user_id: null,
      deleted_at: null,
      updated_at: null,
      private_key: null,
    }
    const result = keypairSchema.safeParse(keypair)
    expect(result.success).toBe(true)
  })

  it("should validate a single keypair response", () => {
    const response = {
      keypair: completeValidKeypair,
    }
    const result = keypairResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it("should validate keypairs list response", () => {
    const response = {
      keypairs: [{ keypair: minimalValidKeypair }, { keypair: completeValidKeypair }],
    }
    const result = keypairsResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it("should reject keypair response without keypair object", () => {
    const response = {}
    const result = keypairResponseSchema.safeParse(response)
    expect(result.success).toBe(false)
  })

  it("should validate create keypair request with name only", () => {
    const createRequest = {
      keypair: {
        name: "new-keypair",
      },
    }
    const result = createKeypairSchema.safeParse(createRequest)
    expect(result.success).toBe(true)
  })

  it("should validate create keypair request with public key", () => {
    const createRequest = {
      keypair: {
        name: "imported-keypair",
        public_key: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC3YcQDKFhQpqt7d...",
        type: "ssh",
      },
    }
    const result = createKeypairSchema.safeParse(createRequest)
    expect(result.success).toBe(true)
  })

  it("should reject create keypair request without name", () => {
    const createRequest = {
      keypair: {
        public_key: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC3YcQDKFhQpqt7d...",
      },
    }
    const result = createKeypairSchema.safeParse(createRequest)
    expect(result.success).toBe(false)
  })

  it("should validate with unexpected extra properties", () => {
    const keypair = {
      ...minimalValidKeypair,
      some_future_property: "value",
      another_property: 123,
    }
    const result = keypairSchema.safeParse(keypair)
    expect(result.success).toBe(true)
  })
})
