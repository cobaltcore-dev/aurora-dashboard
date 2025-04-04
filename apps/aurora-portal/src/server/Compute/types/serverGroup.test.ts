import { describe, it, expect } from "vitest"
import {
  serverGroupSchema,
  serverGroupResponseSchema,
  serverGroupsResponseSchema,
  createServerGroupSchema,
} from "./serverGroup"

describe("OpenStack Server Group Schema Validation", () => {
  const minimalValidServerGroup = {
    id: "sg-12345",
    name: "my-server-group",
  }

  const completeValidServerGroup = {
    id: "sg-12345",
    name: "my-server-group",
    policies: ["anti-affinity", "soft-anti-affinity"],
    policy: "anti-affinity", // Legacy field
    members: ["server-id-1", "server-id-2"],
    metadata: {
      key1: "value1",
      key2: true,
    },
    project_id: "project-123456",
    user_id: "user-123456",
    created_at: "2025-03-15T10:00:00Z",
    updated_at: "2025-03-15T11:00:00Z",
    policy_details: {
      name: "anti-affinity",
      properties: {
        group_size: 5,
      },
    },
    rules: {
      max_server_per_host: 1,
    },
  }

  it("should validate a minimal valid server group", () => {
    const result = serverGroupSchema.safeParse(minimalValidServerGroup)
    expect(result.success).toBe(true)
  })

  it("should validate a complete valid server group", () => {
    const result = serverGroupSchema.safeParse(completeValidServerGroup)
    expect(result.success).toBe(true)
  })

  it("should reject a server group without an id", () => {
    const invalidServerGroup = { name: "invalid-group" }
    const result = serverGroupSchema.safeParse(invalidServerGroup)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("id")
    }
  })

  it("should reject a server group without a name", () => {
    const invalidServerGroup = { id: "sg-12345" }
    const result = serverGroupSchema.safeParse(invalidServerGroup)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("name")
    }
  })

  it("should validate server group with empty policies array", () => {
    const serverGroup = {
      ...minimalValidServerGroup,
      policies: [],
    }
    const result = serverGroupSchema.safeParse(serverGroup)
    expect(result.success).toBe(true)
  })

  it("should validate server group with empty members array", () => {
    const serverGroup = {
      ...minimalValidServerGroup,
      members: [],
    }
    const result = serverGroupSchema.safeParse(serverGroup)
    expect(result.success).toBe(true)
  })

  it("should validate server group with null updated_at", () => {
    const serverGroup = {
      ...minimalValidServerGroup,
      updated_at: null,
    }
    const result = serverGroupSchema.safeParse(serverGroup)
    expect(result.success).toBe(true)
  })

  it("should validate a single server group response", () => {
    const response = {
      server_group: completeValidServerGroup,
    }
    const result = serverGroupResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it("should validate server groups list response", () => {
    const response = {
      server_groups: [minimalValidServerGroup, completeValidServerGroup],
    }
    const result = serverGroupsResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it("should reject server group response without server_group object", () => {
    const response = {}
    const result = serverGroupResponseSchema.safeParse(response)
    expect(result.success).toBe(false)
  })

  it("should validate create server group request with name only", () => {
    const createRequest = {
      server_group: {
        name: "new-server-group",
      },
    }
    const result = createServerGroupSchema.safeParse(createRequest)
    expect(result.success).toBe(true)
  })

  it("should validate create server group request with policies", () => {
    const createRequest = {
      server_group: {
        name: "new-server-group",
        policies: ["affinity"],
      },
    }
    const result = createServerGroupSchema.safeParse(createRequest)
    expect(result.success).toBe(true)
  })

  it("should validate create server group request with policy (legacy)", () => {
    const createRequest = {
      server_group: {
        name: "new-server-group",
        policy: "affinity",
      },
    }
    const result = createServerGroupSchema.safeParse(createRequest)
    expect(result.success).toBe(true)
  })

  it("should validate create server group request with rules", () => {
    const createRequest = {
      server_group: {
        name: "new-server-group",
        policies: ["anti-affinity"],
        rules: {
          max_server_per_host: 1,
        },
      },
    }
    const result = createServerGroupSchema.safeParse(createRequest)
    expect(result.success).toBe(true)
  })

  it("should reject create server group request without name", () => {
    const createRequest = {
      server_group: {
        policies: ["affinity"],
      },
    }
    const result = createServerGroupSchema.safeParse(createRequest)
    expect(result.success).toBe(false)
  })

  it("should validate with unexpected extra properties", () => {
    const serverGroup = {
      ...minimalValidServerGroup,
      some_future_property: "value",
      another_property: 123,
    }
    const result = serverGroupSchema.safeParse(serverGroup)
    expect(result.success).toBe(true)
  })
})
