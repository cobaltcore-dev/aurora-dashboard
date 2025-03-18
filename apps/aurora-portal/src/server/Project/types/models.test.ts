import { baseProjectSchema, projectSchema, projectsResponseSchema } from "./models"
import { describe, expect, test } from "vitest"

const example = {
  is_domain: false,
  description: null,
  domain_id: "default",
  enabled: true,
  id: "0c4e939acacf4376bdcd1129f1a054ad",
  links: {
    self: "http://example.com/identity/v3/projects/0c4e939acacf4376bdcd1129f1a054ad",
  },
  name: "admin",
  parent_id: "default",
  options: {},
}
const examplewithParent = {
  domain_id: "1789d1",
  enabled: true,
  id: "263fd9",
  links: {
    self: "http://example.com/identity/v3/projects/263fd9",
  },
  name: "Dev Group A",
  options: {},
  parent_id: "183ab2",
  parents: [
    {
      project: {
        domain_id: "1789d1",
        enabled: true,
        id: "183ab2",
        links: {
          self: "http://example.com/identity/v3/projects/183ab2",
        },
        name: "Dev Group A Parent",
        parent_id: null,
      },
    },
  ],
}

const exampleResponse = {
  links: {
    next: null,
    previous: null,
    self: "http://example.com/identity/v3/projects",
  },
  projects: [
    {
      is_domain: false,
      description: null,
      domain_id: "default",
      enabled: true,
      id: "0c4e939acacf4376bdcd1129f1a054ad",
      links: {
        self: "http://example.com/identity/v3/projects/0c4e939acacf4376bdcd1129f1a054ad",
      },
      name: "admin",
      parent_id: null,
      tags: [],
    },
    {
      is_domain: false,
      description: null,
      domain_id: "default",
      enabled: true,
      id: "0cbd49cbf76d405d9c86562e1d579bd3",
      links: {
        self: "http://example.com/identity/v3/projects/0cbd49cbf76d405d9c86562e1d579bd3",
      },
      name: "demo",
      parent_id: null,
      tags: [],
    },
    {
      is_domain: false,
      description: null,
      domain_id: "default",
      enabled: true,
      id: "2db68fed84324f29bb73130c6c2094fb",
      links: {
        self: "http://example.com/identity/v3/projects/2db68fed84324f29bb73130c6c2094fb",
      },
      name: "swifttenanttest2",
      parent_id: null,
      tags: [],
    },
    {
      is_domain: false,
      description: null,
      domain_id: "default",
      enabled: true,
      id: "3d594eb0f04741069dbbb521635b21c7",
      links: {
        self: "http://example.com/identity/v3/projects/3d594eb0f04741069dbbb521635b21c7",
      },
      name: "service",
      parent_id: null,
      tags: [],
    },
    {
      is_domain: false,
      description: null,
      domain_id: "default",
      enabled: true,
      id: "43ebde53fc314b1c9ea2b8c5dc744927",
      links: {
        self: "http://example.com/identity/v3/projects/43ebde53fc314b1c9ea2b8c5dc744927",
      },
      name: "swifttenanttest1",
      parent_id: null,
      tags: [],
    },
    {
      is_domain: false,
      description: "",
      domain_id: "1bc2169ca88e4cdaaba46d4c15390b65",
      enabled: true,
      id: "4b1eb781a47440acb8af9850103e537f",
      links: {
        self: "http://example.com/identity/v3/projects/4b1eb781a47440acb8af9850103e537f",
      },
      name: "swifttenanttest4",
      parent_id: null,
      tags: [],
    },
    {
      is_domain: false,
      description: null,
      domain_id: "default",
      enabled: true,
      id: "5961c443439d4fcebe42643723755e9d",
      links: {
        self: "http://example.com/identity/v3/projects/5961c443439d4fcebe42643723755e9d",
      },
      name: "invisible_to_admin",
      parent_id: null,
      tags: [],
    },
    {
      is_domain: false,
      description: null,
      domain_id: "default",
      enabled: true,
      id: "fdb8424c4e4f4c0ba32c52e2de3bd80e",
      links: {
        self: "http://example.com/identity/v3/projects/fdb8424c4e4f4c0ba32c52e2de3bd80e",
      },
      name: "alt_demo",
      parent_id: null,
      tags: [],
    },
  ],
}

describe("Project Schema Validation", () => {
  test("Valid base project should pass", () => {
    const result = baseProjectSchema.safeParse(example)
    if (!result.success) {
      console.error("Non-detailed project validation errors:", JSON.stringify(result.error.errors, null, 2))
    }
    expect(result.success).toBe(true)
  })

  test("Base project missing required fields should fail", () => {
    const result = baseProjectSchema.safeParse({ name: "Missing ID" })
    expect(result.success).toBe(false)
  })

  test("Valid project with parent should pass", () => {
    const result = projectSchema.safeParse(examplewithParent)
    expect(result.success).toBe(true)
  })

  test("Valid projects response should pass", () => {
    const result = projectsResponseSchema.safeParse(exampleResponse)
    expect(result.success).toBe(true)
  })
})
