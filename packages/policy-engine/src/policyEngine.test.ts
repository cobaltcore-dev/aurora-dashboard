import { PolicyEngine } from "./policyEngine.js"

const policyConfig = {
  project_parent: "not null:%(target.project.parent_id)s",
  monsoon2_domain: "'monsoon2':%(target.scoped_domain_name)s",

  admin_required: " role:admin or is_admin:1",

  cloud_admin: "rule:admin_required and (is_admin_project:True or domain_id:ccadmin)",
  domain_admin: "rule:admin_required and not token.domain.id:null",
  project_admin: "rule:admin_required and not project_id:null",
  cloud_admin_or_support: "rule:cloud_admin or role:cloud_support_tools_viewer",
  cloud_admin_or_support_or_dns_ops: "rule:cloud_admin or role:cloud_support_tools_viewer or role:cloud_dns_ops",
  cloud_support: "role:cloud_support_tools_viewer",

  _default: "rule:admin_required",

  service_role: "role:service",
  service_or_admin: "rule:admin_required or rule:service_role",
  owner: "user_id:%(user_id)s",
  admin_or_owner: "rule:admin_required or rule:owner",
  token_subject: "user_id:%(target.token.user_id)s",
  admin_or_token_subject: "rule:admin_required or rule:token_subject",
  can_write: "not domain_name:'monsoon2'",
}

const tokenPayload = {
  audit_ids: ["3T2dc1CGQxyJsHdDu1xkcw"],
  expires_at: "2015-11-07T02:58:43.578887Z",
  is_domain: false,
  issued_at: "2015-11-07T01:58:43.578929Z",
  project: {
    domain: {
      id: "default",
      name: "Default",
    },
    id: "a6944d763bf64ee6a275f1263fae0352",
    name: "admin",
  },
  roles: [
    {
      id: "51cc68287d524c759f47c811e6463340",
      name: "admin",
    },
  ],
  user: {
    domain: {
      id: "default",
      name: "Default",
    },
    id: "ee4dfb6e5540447cb3741905149d9b6e",
    name: "admin",
    password_expires_at: "2016-11-06T15:32:17.000000",
  },
}

describe("policy engine", () => {
  it("responds to userPolicy", () => {
    const engine = new PolicyEngine(policyConfig)
    expect(typeof engine.policy).toEqual("function")
  })

  describe("policy", () => {
    let engine: PolicyEngine
    beforeEach(() => {
      engine = new PolicyEngine(policyConfig)
    })

    it("returns a object", () => {
      const userPolicy = engine.policy(tokenPayload)
      expect(typeof userPolicy).toEqual("object")
    })

    it("responds to check", () => {
      const userPolicy = engine.policy(tokenPayload)
      expect(typeof userPolicy.check).toEqual("function")
    })
  })

  describe("policy check", () => {
    let policy: ReturnType<PolicyEngine["policy"]>, engine: PolicyEngine
    beforeEach(() => {
      engine = new PolicyEngine(policyConfig)
      policy = engine.policy(tokenPayload)
    })

    describe("project_parent", () => {
      it("returns true", () => {
        const result = policy.check("project_parent", {
          target: { project: { parent_id: "12345" } },
        })
        expect(result).toEqual(true)
      })

      it("returns false", () => {
        const result = policy.check("project_parent", {
          target: { project: { parent_id: null } },
        })
        expect(result).toEqual(false)
      })
    })

    describe("monsoon2_domain", () => {
      it("returns true", () => {
        const result = policy.check("monsoon2_domain", {
          target: { scoped_domain_name: "monsoon2" },
        })
        expect(result).toEqual(true)
      })

      it("returns false", () => {
        const result = policy.check("monsoon2_domain", {
          target: { scoped_domain_name: "unknown" },
        })
        expect(result).toEqual(false)
      })
    })

    //role:admin or is_admin:1
    describe("admin_required", () => {
      it("returns true", () => {
        const result = policy.check("admin_required")
        expect(result).toEqual(true)
      })
    })

    describe("cloud_admin", () => {
      it("returns false", () => {
        const result = policy.check("cloud_admin")
        expect(result).toEqual(false)
      })
    })

    describe("domain_admin", () => {
      it("returns false", () => {
        const newPolicy = engine.policy({
          ...tokenPayload,
          project: undefined,
          domain: undefined,
        })

        const result = newPolicy.check("domain_admin")
        expect(result).toEqual(false)
      })
    })

    //project_admin: "rule:admin_required and not project_id:null",
    describe("project_admin", () => {
      it("returns true", () => {
        const result = policy.check("project_admin")
        expect(result).toEqual(true)
      })
    })

    //cloud_admin_or_support: "rule:cloud_admin or role:cloud_support_tools_viewer",
    describe("cloud_admin_or_support", () => {
      it("returns false", () => {
        const result = policy.check("cloud_admin_or_support")
        expect(result).toEqual(false)
      })
    })

    //cloud_admin_or_support_or_dns_ops: "rule:cloud_admin or role:cloud_support_tools_viewer or role:cloud_dns_ops",
    describe("cloud_admin_or_support_or_dns_ops", () => {
      it("returns false", () => {
        const result = policy.check("cloud_admin_or_support_or_dns_ops")
        expect(result).toEqual(false)
      })
    })

    //cloud_support: "role:cloud_support_tools_viewer",
    describe("cloud_support", () => {
      it("returns false", () => {
        const result = policy.check("cloud_support")
        expect(result).toEqual(false)
      })
    })

    //fallback to default rule
    describe("unknown rule, look for _default", () => {
      it("returns true", () => {
        const result = policy.check("unknown")
        expect(result).toEqual(true)
      })
    })

    //cloud_support: "role:cloud_support_tools_viewer",
    describe("service_role", () => {
      it("returns false", () => {
        const result = policy.check("service_role")
        expect(result).toEqual(false)
      })
    })

    //service_or_admin: "rule:admin_required or rule:service_role",
    describe("service_or_admin", () => {
      it("returns true", () => {
        const result = policy.check("service_or_admin")
        expect(result).toEqual(true)
      })
    })

    // owner: "user_id:%(user_id)s",
    describe("owner", () => {
      it("returns true", () => {
        const result = policy.check("owner", {
          user_id: "ee4dfb6e5540447cb3741905149d9b6e",
        })
        expect(result).toEqual(true)
      })

      it("returns false", () => {
        const result = policy.check("owner", {
          user_id: "12345",
        })
        expect(result).toEqual(false)
      })
    })

    //admin_or_owner: "rule:admin_required or rule:owner",
    describe("admin_or_owner", () => {
      it("returns true", () => {
        const result = policy.check("admin_or_owner")
        expect(result).toEqual(true)
      })
    })

    //token_subject: "user_id:%(target.token.user_id)s",
    describe("token_subject", () => {
      it("returns true", () => {
        const result = policy.check("token_subject", {
          target: { token: { user_id: "ee4dfb6e5540447cb3741905149d9b6e" } },
        })
        expect(result).toEqual(true)
      })

      it("returns false", () => {
        const result = policy.check("token_subject")
        expect(result).toEqual(false)
      })
    })

    //admin_or_token_subject: "rule:admin_required or rule:token_subject",
    describe("admin_or_token_subject", () => {
      it("returns true", () => {
        const result = policy.check("admin_or_token_subject")
        expect(result).toEqual(true)
      })
    })

    //  can_write: "not domain_name:'monsoon2'",
    describe("can_write", () => {
      it("returns true", () => {
        const result = policy.check("can_write")
        expect(result).toEqual(true)
      })
    })
  })

  describe("debug", () => {
    console.log = vi.fn()
    let policy: ReturnType<PolicyEngine["policy"]>, engine: PolicyEngine
    beforeEach(() => {
      engine = new PolicyEngine(policyConfig)
      policy = engine.policy(tokenPayload, { debug: true })
    })

    // project_parent: "not null:%(target.project.parent_id)s",
    it("project_parent", () => {
      policy.check("project_parent")
      expect(console.log).toHaveBeenCalled()
    })
  })
})
