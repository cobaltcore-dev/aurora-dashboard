import { describe, it, expect } from "vitest"
import {
  AccessReviewApiResponseSchema,
  SelfSubjectAccessReviewListSchema,
  type SelfSubjectAccessReview,
  type ResourceAttributes,
} from "./accessReviewApiSchema"

describe("AccessReviewApiSchema", () => {
  describe("AccessReviewApiResponseSchema", () => {
    it("should validate a minimal valid SelfSubjectAccessReview", () => {
      const validData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {},
      }

      const result = AccessReviewApiResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.kind).toBe("SelfSubjectAccessReview")
        expect(result.data.apiVersion).toBe("authorization.k8s.io/v1")
        expect(result.data.spec).toEqual({})
      }
    })

    it("should validate a complete SelfSubjectAccessReview with resourceAttributes", () => {
      const validData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            namespace: "default",
            verb: "get",
            group: "apps",
            resource: "deployments",
            subresource: "status",
            name: "my-deployment",
            version: "v1",
          },
        },
        status: {
          allowed: true,
          denied: false,
          reason: "RBAC allows access",
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.spec.resourceAttributes).toEqual(validData.spec.resourceAttributes)
        expect(result.data.status?.allowed).toBe(true)
        expect(result.data.status?.denied).toBe(false)
      }
    })

    it("should validate a SelfSubjectAccessReview with nonResourceAttributes", () => {
      const validData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          nonResourceAttributes: {
            path: "/api/v1/nodes",
            verb: "get",
          },
        },
        status: {
          allowed: false,
          denied: true,
          reason: "Access denied by policy",
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.spec.nonResourceAttributes?.path).toBe("/api/v1/nodes")
        expect(result.data.spec.nonResourceAttributes?.verb).toBe("get")
      }
    })

    it("should validate with both resourceAttributes and nonResourceAttributes", () => {
      const validData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            verb: "create",
            resource: "pods",
          },
          nonResourceAttributes: {
            path: "/healthz",
            verb: "get",
          },
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject invalid kind", () => {
      const invalidData = {
        kind: "InvalidKind",
        apiVersion: "authorization.k8s.io/v1",
        spec: {},
      }

      const result = AccessReviewApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("invalid_literal")
        expect(result.error.issues[0].path).toEqual(["kind"])
      }
    })

    it("should reject missing required fields", () => {
      const invalidData = {
        kind: "SelfSubjectAccessReview" as const,
        // missing apiVersion and spec
      }

      const result = AccessReviewApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const missingFields = result.error.issues.map((issue) => issue.path[0])
        expect(missingFields).toContain("apiVersion")
        expect(missingFields).toContain("spec")
      }
    })

    it("should reject invalid types for required fields", () => {
      const invalidData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: 123, // should be string
        spec: "invalid", // should be object
      }

      const result = AccessReviewApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0)
      }
    })
  })

  describe("ResourceAttributes validation", () => {
    it("should validate minimal resourceAttributes with only required fields", () => {
      const validData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            verb: "get",
            resource: "pods",
          },
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject resourceAttributes with missing required fields", () => {
      const invalidData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            namespace: "default",
            // missing verb and resource
          },
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        const missingFields = result.error.issues.map((issue) => issue.path[issue.path.length - 1])
        expect(missingFields).toContain("verb")
        expect(missingFields).toContain("resource")
      }
    })

    it("should reject resourceAttributes with invalid types", () => {
      const invalidData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            verb: 123, // should be string
            resource: true, // should be string
            namespace: null, // should be string if provided
          },
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("NonResourceAttributes validation", () => {
    it("should validate nonResourceAttributes with required fields", () => {
      const validData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          nonResourceAttributes: {
            path: "/api/v1",
            verb: "get",
          },
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should reject nonResourceAttributes with missing required fields", () => {
      const invalidData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          nonResourceAttributes: {
            path: "/api/v1",
            // missing verb
          },
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("Status validation", () => {
    it("should validate status with only allowed field", () => {
      const validData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {},
        status: {
          allowed: true,
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should validate status with all optional fields", () => {
      const validData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {},
        status: {
          allowed: false,
          denied: true,
          reason: "Insufficient permissions",
          evaluationError: "Policy evaluation failed",
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status?.allowed).toBe(false)
        expect(result.data.status?.denied).toBe(true)
        expect(result.data.status?.reason).toBe("Insufficient permissions")
        expect(result.data.status?.evaluationError).toBe("Policy evaluation failed")
      }
    })

    it("should reject status with invalid allowed field type", () => {
      const invalidData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {},
        status: {
          allowed: "yes", // should be boolean
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should reject status missing required allowed field", () => {
      const invalidData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {},
        status: {
          denied: true,
          reason: "Access denied",
          // missing allowed field
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe("SelfSubjectAccessReviewListSchema", () => {
    it("should validate an empty array", () => {
      const result = SelfSubjectAccessReviewListSchema.safeParse([])
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([])
      }
    })

    it("should validate an array with valid SelfSubjectAccessReview objects", () => {
      const validArray = [
        {
          kind: "SelfSubjectAccessReview" as const,
          apiVersion: "authorization.k8s.io/v1",
          spec: {
            resourceAttributes: {
              verb: "get",
              resource: "pods",
            },
          },
          status: {
            allowed: true,
          },
        },
        {
          kind: "SelfSubjectAccessReview" as const,
          apiVersion: "authorization.k8s.io/v1",
          spec: {
            nonResourceAttributes: {
              path: "/healthz",
              verb: "get",
            },
          },
          status: {
            allowed: false,
            denied: true,
          },
        },
      ]

      const result = SelfSubjectAccessReviewListSchema.safeParse(validArray)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.length).toBe(2)
      }
    })

    it("should reject array with invalid SelfSubjectAccessReview objects", () => {
      const invalidArray = [
        {
          kind: "SelfSubjectAccessReview" as const,
          apiVersion: "authorization.k8s.io/v1",
          spec: {},
        },
        {
          kind: "InvalidKind",
          apiVersion: "authorization.k8s.io/v1",
          spec: {},
        },
      ]

      const result = SelfSubjectAccessReviewListSchema.safeParse(invalidArray)
      expect(result.success).toBe(false)
    })

    it("should reject non-array input", () => {
      const result = SelfSubjectAccessReviewListSchema.safeParse("not an array")
      expect(result.success).toBe(false)
    })
  })

  describe("Type inference", () => {
    it("should properly infer SelfSubjectAccessReview type", () => {
      const review: SelfSubjectAccessReview = {
        kind: "SelfSubjectAccessReview",
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            verb: "get",
            resource: "pods",
          },
        },
        status: {
          allowed: true,
        },
      }

      // This should compile without errors due to proper type inference
      expect(review.kind).toBe("SelfSubjectAccessReview")
      expect(typeof review.apiVersion).toBe("string")
      expect(typeof review.spec).toBe("object")
    })

    it("should properly infer ResourceAttributes type", () => {
      const resourceAttrs: ResourceAttributes = {
        verb: "create",
        resource: "deployments",
        namespace: "default",
        group: "apps",
      }

      // This should compile without errors due to proper type inference
      expect(typeof resourceAttrs.verb).toBe("string")
      expect(typeof resourceAttrs.resource).toBe("string")
      expect(typeof resourceAttrs.namespace).toBe("string")
    })
  })

  describe("Edge cases and boundary conditions", () => {
    it("should handle empty strings in optional fields", () => {
      const validData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            verb: "get",
            resource: "pods",
            namespace: "",
            name: "",
            subresource: "",
          },
        },
        status: {
          allowed: true,
          reason: "",
          evaluationError: "",
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should handle null values gracefully where not allowed", () => {
      const invalidData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: null, // should be string
        spec: null, // should be object
      }

      const result = AccessReviewApiResponseSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it("should handle undefined optional fields", () => {
      const validData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: {
            verb: "get",
            resource: "pods",
            namespace: undefined,
            name: undefined,
            subresource: undefined,
            group: undefined,
            version: undefined,
          },
        },
        status: undefined,
      }

      const result = AccessReviewApiResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it("should validate spec with both resource and non-resource attributes as undefined", () => {
      const validData = {
        kind: "SelfSubjectAccessReview" as const,
        apiVersion: "authorization.k8s.io/v1",
        spec: {
          resourceAttributes: undefined,
          nonResourceAttributes: undefined,
        },
      }

      const result = AccessReviewApiResponseSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })
})
