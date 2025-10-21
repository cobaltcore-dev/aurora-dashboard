import { describe, it, expect } from "vitest"
import { getServiceIndex } from "./index"

describe("getServiceIndex", () => {
  it("should return an empty object when given an empty array", () => {
    const result = getServiceIndex([])
    expect(result).toEqual({})
  })

  it("should index a single service correctly", () => {
    const services = [{ name: "s3", type: "storage" }]
    const result = getServiceIndex(services)

    expect(result).toEqual({
      storage: { s3: true },
    })
  })

  it("should group multiple services by type", () => {
    const services = [
      { name: "s3", type: "storage" },
      { name: "dynamodb", type: "database" },
      { name: "rds", type: "database" },
    ]
    const result = getServiceIndex(services)

    expect(result).toEqual({
      storage: { s3: true },
      database: { dynamodb: true, rds: true },
    })
  })

  it("should handle multiple services of the same type", () => {
    const services = [
      { name: "ec2", type: "compute" },
      { name: "lambda", type: "compute" },
      { name: "ecs", type: "compute" },
    ]
    const result = getServiceIndex(services)

    expect(result).toEqual({
      compute: {
        ec2: true,
        lambda: true,
        ecs: true,
      },
    })
  })

  it("should handle services with duplicate names in different types", () => {
    const services = [
      { name: "backup", type: "storage" },
      { name: "backup", type: "database" },
    ]
    const result = getServiceIndex(services)

    expect(result).toEqual({
      storage: { backup: true },
      database: { backup: true },
    })
  })

  it("should overwrite duplicate services of the same type and name", () => {
    const services = [
      { name: "s3", type: "storage" },
      { name: "s3", type: "storage" },
    ]
    const result = getServiceIndex(services)

    expect(result).toEqual({
      storage: { s3: true },
    })
    // Verify only one entry exists
    expect(Object.keys(result.storage)).toHaveLength(1)
  })

  it("should allow O(1) lookup for service existence", () => {
    const services = [
      { name: "s3", type: "storage" },
      { name: "dynamodb", type: "database" },
    ]
    const result = getServiceIndex(services)

    // Check existing service
    expect(result["storage"]?.["s3"]).toBe(true)
    expect(result["database"]?.["dynamodb"]).toBe(true)

    // Check non-existing service
    expect(result["storage"]?.["rds"]).toBeUndefined()
    expect(result["compute"]).toBeUndefined()
  })

  it("should handle services with special characters in names", () => {
    const services = [
      { name: "s3-bucket", type: "storage" },
      { name: "my_service", type: "custom" },
      { name: "service.name", type: "custom" },
    ]
    const result = getServiceIndex(services)

    expect(result).toEqual({
      storage: { "s3-bucket": true },
      custom: {
        my_service: true,
        "service.name": true,
      },
    })
  })

  it("should handle a large number of services efficiently", () => {
    const services = Array.from({ length: 1000 }, (_, i) => ({
      name: `service${i}`,
      type: `type${i % 10}`,
    }))

    const result = getServiceIndex(services)

    // Should have 10 types (0-9)
    expect(Object.keys(result)).toHaveLength(10)

    // Each type should have 100 services
    Object.keys(result).forEach((type) => {
      expect(Object.keys(result[type])).toHaveLength(100)
    })

    // Verify a specific entry
    expect(result["type5"]?.["service5"]).toBe(true)
  })

  it("should maintain immutability of input array", () => {
    const services = [{ name: "s3", type: "storage" }]
    const originalServices = JSON.parse(JSON.stringify(services))

    getServiceIndex(services)

    expect(services).toEqual(originalServices)
  })

  it("should handle mixed case service names and types", () => {
    const services = [
      { name: "S3", type: "Storage" },
      { name: "s3", type: "storage" },
    ]
    const result = getServiceIndex(services)

    expect(result).toEqual({
      Storage: { S3: true },
      storage: { s3: true },
    })
  })
})
