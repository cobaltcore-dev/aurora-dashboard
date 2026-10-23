import { describe, it, expect } from "vitest"
import {
  SecretSchema,
  ContainerSchema,
  OrderSchema,
  SecretsListSchema,
  ContainersListSchema,
  OrdersListSchema,
  CreateSecretInputSchema,
  UpdateSecretInputSchema,
  CreateContainerInputSchema,
  CreateOrderInputSchema,
} from "./keyManager"

const validSecret = {
  secret_ref: "https://barbican.example.com/v1/secrets/secret-1",
  name: "db-password",
  status: "ACTIVE",
  algorithm: "aes",
  bit_length: 256,
  mode: "cbc",
  secret_type: "opaque",
  content_types: { default: "text/plain" },
  created: "2026-01-10T08:00:00Z",
  updated: "2026-01-10T08:00:00Z",
  expiration: null,
}

const validContainer = {
  container_ref: "https://barbican.example.com/v1/containers/container-1",
  name: "tls-bundle",
  type: "certificate",
  status: "ACTIVE",
  created: "2026-01-10T08:00:00Z",
  updated: "2026-01-10T08:00:00Z",
  secret_refs: [{ name: "certificate", secret_ref: "https://barbican.example.com/v1/secrets/secret-1" }],
}

const validOrder = {
  order_ref: "https://barbican.example.com/v1/orders/order-1",
  type: "key",
  status: "ACTIVE",
  created: "2026-01-10T08:00:00Z",
  updated: "2026-01-10T08:00:00Z",
  secret_ref: "https://barbican.example.com/v1/secrets/secret-1",
  meta: { name: "generated-key" },
}

describe("SecretSchema", () => {
  it("validates a complete secret", () => {
    expect(SecretSchema.safeParse(validSecret).success).toBe(true)
  })

  it("accepts a null name and null content_types", () => {
    const result = SecretSchema.safeParse({ ...validSecret, name: null, content_types: null })
    expect(result.success).toBe(true)
  })

  it("accepts a secret without the optional content_types key", () => {
    const withoutContentTypes: Record<string, unknown> = { ...validSecret }
    delete withoutContentTypes.content_types
    expect(SecretSchema.safeParse(withoutContentTypes).success).toBe(true)
  })

  it.each(["secret_ref", "status", "secret_type", "created", "updated"])("rejects a secret without %s", (field) => {
    const secret: Record<string, unknown> = { ...validSecret }
    delete secret[field]
    const result = SecretSchema.safeParse(secret)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0].path).toContain(field)
  })

  it("rejects a non-string content_types value", () => {
    expect(SecretSchema.safeParse({ ...validSecret, content_types: { default: 123 } }).success).toBe(false)
  })
})

describe("ContainerSchema", () => {
  it("validates a complete container", () => {
    expect(ContainerSchema.safeParse(validContainer).success).toBe(true)
  })

  it.each(["generic", "rsa", "certificate"])("accepts the %s container type", (type) => {
    expect(ContainerSchema.safeParse({ ...validContainer, type }).success).toBe(true)
  })

  it("rejects an unknown container type", () => {
    expect(ContainerSchema.safeParse({ ...validContainer, type: "bogus" }).success).toBe(false)
  })

  it("requires secret_refs entries to have a name and secret_ref", () => {
    expect(ContainerSchema.safeParse({ ...validContainer, secret_refs: [{ name: "x" }] }).success).toBe(false)
  })
})

describe("OrderSchema", () => {
  it("validates a complete order", () => {
    expect(OrderSchema.safeParse(validOrder).success).toBe(true)
  })

  it("accepts a null secret_ref and optional sub_status", () => {
    const result = OrderSchema.safeParse({ ...validOrder, secret_ref: null })
    expect(result.success).toBe(true)
  })

  it("requires a meta record", () => {
    const withoutMeta: Record<string, unknown> = { ...validOrder }
    delete withoutMeta.meta
    expect(OrderSchema.safeParse(withoutMeta).success).toBe(false)
  })
})

describe("list response schemas", () => {
  it("validates a secrets list", () => {
    expect(SecretsListSchema.safeParse({ total: 1, secrets: [validSecret] }).success).toBe(true)
  })

  it("validates an empty secrets list", () => {
    expect(SecretsListSchema.safeParse({ total: 0, secrets: [] }).success).toBe(true)
  })

  it("rejects a secrets list without a total", () => {
    expect(SecretsListSchema.safeParse({ secrets: [] }).success).toBe(false)
  })

  it("validates a containers list", () => {
    expect(ContainersListSchema.safeParse({ total: 1, containers: [validContainer] }).success).toBe(true)
  })

  it("validates an orders list", () => {
    expect(OrdersListSchema.safeParse({ total: 1, orders: [validOrder] }).success).toBe(true)
  })

  it("carries optional next and previous cursors", () => {
    const result = SecretsListSchema.safeParse({ total: 1, secrets: [validSecret], next: "n", previous: "p" })
    expect(result.success && result.data.next).toBe("n")
  })
})

describe("CreateSecretInputSchema", () => {
  it("defaults secret_type to opaque", () => {
    const result = CreateSecretInputSchema.safeParse({})
    expect(result.success && result.data.secret_type).toBe("opaque")
  })

  it("accepts a full create payload", () => {
    const result = CreateSecretInputSchema.safeParse({
      name: "api-key",
      secret_type: "passphrase",
      algorithm: "aes",
      bit_length: 256,
      payload: "value",
      payload_content_type: "text/plain",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a non-numeric bit_length", () => {
    expect(CreateSecretInputSchema.safeParse({ bit_length: "256" }).success).toBe(false)
  })
})

describe("UpdateSecretInputSchema", () => {
  it("defaults payload_content_type to text/plain", () => {
    const result = UpdateSecretInputSchema.safeParse({ secretId: "secret-1", payload: "value" })
    expect(result.success && result.data.payload_content_type).toBe("text/plain")
  })

  it("requires secretId and payload", () => {
    expect(UpdateSecretInputSchema.safeParse({ secretId: "secret-1" }).success).toBe(false)
    expect(UpdateSecretInputSchema.safeParse({ payload: "value" }).success).toBe(false)
  })
})

describe("CreateContainerInputSchema", () => {
  it("defaults secret_refs to an empty array", () => {
    const result = CreateContainerInputSchema.safeParse({ type: "generic" })
    expect(result.success && result.data.secret_refs).toEqual([])
  })

  it("requires a valid container type", () => {
    expect(CreateContainerInputSchema.safeParse({}).success).toBe(false)
    expect(CreateContainerInputSchema.safeParse({ type: "bogus" }).success).toBe(false)
  })
})

describe("CreateOrderInputSchema", () => {
  it.each(["key", "asymmetric", "certificate"])("accepts the %s order type", (type) => {
    expect(CreateOrderInputSchema.safeParse({ type, meta: { name: "x" } }).success).toBe(true)
  })

  it("rejects an unknown order type", () => {
    expect(CreateOrderInputSchema.safeParse({ type: "bogus", meta: {} }).success).toBe(false)
  })

  it("requires meta", () => {
    expect(CreateOrderInputSchema.safeParse({ type: "key" }).success).toBe(false)
  })
})
