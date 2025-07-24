import { PolicyEngine } from "./policyEngine.js"

const realPolicyConfig = {
  admin_required: "role:admin",
  service_role: "role:service",
  service_or_admin: "rule:admin_required or rule:service_role",
  owner: "user_id:%(user_id)s",
  token_subject: "user_id:%(target.token.user_id)s",
  cloud_admin:
    "(role:admin and system_scope:all) or (role:admin and ((is_admin_project:True or domain_id:default) or project_id:tempest-admin-project-123))",
  cloud_reader:
    "(role:reader and system_scope:all) or role:cloud_identity_viewer or rule:service_role or rule:cloud_admin",
  blocklist_roles:
    "'resource_service':%(target.role.name)s or 'cloud_registry_admin':%(target.role.name)s or 'cloud_registry_viewer':%(target.role.name)s or 'cloud_resource_admin':%(target.role.name)s or 'cloud_resource_viewer':%(target.role.name)s or 'cloud_masterdata_admin':%(target.role.name)s or 'cloud_masterdata_viewer':%(target.role.name)s or 'cloud_baremetal_admin':%(target.role.name)s or 'cloud_network_admin':%(target.role.name)s or 'cloud_dns_admin':%(target.role.name)s or 'cloud_dns_viewer':%(target.role.name)s or 'dns_admin':%(target.role.name)s or 'dns_hostmaster':%(target.role.name)s or 'dns_zonemaster':%(target.role.name)s or 'dns_mailmaster':%(target.role.name)s or 'cloud_image_admin':%(target.role.name)s or 'cloud_compute_admin':%(target.role.name)s or 'cloud_keymanager_admin':%(target.role.name)s or 'cloud_volume_admin':%(target.role.name)s or 'cloud_sharedfilesystem_admin':%(target.role.name)s or 'cloud_sharedfilesystem_editor':%(target.role.name)s or 'cloud_sharedfilesystem_viewer':%(target.role.name)s or 'cloud_objectstore_admin':%(target.role.name)s or 'cloud_objectstore_viewer':%(target.role.name)s or 'service':%(target.role.name)s or 'cloud_identity_viewer':%(target.role.name)s or 'cloud_support_tools_viewer':%(target.role.name)s or 'cloud_email_admin':%(target.role.name)s or 'cloud_inventory_viewer':%(target.role.name)s",
  blocklist_projects: "'cloud-admin-project-456':%(target.project.id)s",
  domain_admin_for_grants:
    "(rule:domain_admin_for_global_role_grants or rule:domain_admin_for_domain_role_grants) and not rule:blocklist_roles and not rule:blocklist_projects",
  domain_admin_for_global_role_grants:
    "rule:admin_required and None:%(target.role.domain_id)s and rule:domain_admin_grant_match",
  domain_admin_for_domain_role_grants:
    "rule:admin_required and domain_id:%(target.role.domain_id)s and rule:domain_admin_grant_match",
  domain_admin_grant_match: "domain_id:%(domain_id)s or domain_id:%(target.project.domain_id)s",
  project_admin_for_grants:
    "(rule:project_admin_for_global_role_grants or rule:project_admin_for_domain_role_grants) and not rule:blocklist_roles and not rule:blocklist_projects",
  project_admin_for_global_role_grants:
    "(rule:admin_required or role:role_admin) and None:%(target.role.domain_id)s and (project_id:%(project_id)s or project_id:%(target.project.parent_id)s)",
  project_admin_for_domain_role_grants:
    "(rule:admin_required or role:role_admin) and project_domain_id:%(target.role.domain_id)s and (project_id:%(project_id)s or project_id:%(target.project.parent_id)s)",
  domain_admin_for_list_grants: "rule:admin_required and rule:domain_admin_grant_match",
  project_admin_for_list_grants:
    "(rule:admin_required or role:role_admin or role:role_viewer) and (project_id:%(project_id)s or project_id:%(target.project.parent_id)s)",
  // Add all the identity policies from the real config
  "identity:get_access_rule": "rule:cloud_reader or user_id:%(target.user.id)s",
  "identity:list_access_rules": "rule:cloud_reader or user_id:%(target.user.id)s",
  "identity:delete_access_rule": "rule:cloud_admin or user_id:%(target.user.id)s",
  "identity:get_application_credential": "rule:cloud_reader or rule:owner",
  "identity:list_application_credentials": "rule:cloud_reader or rule:owner",
  "identity:delete_application_credential": "rule:cloud_admin or rule:owner",
  "identity:get_domain":
    "rule:cloud_reader or token.domain.id:%(target.domain.id)s or token.project.domain.id:%(target.domain.id)s or role:role_viewer",
  "identity:list_domains": "rule:cloud_reader or role:role_viewer",
  "identity:create_domain": "rule:cloud_admin",
  "identity:update_domain": "rule:cloud_admin",
  "identity:delete_domain": "rule:cloud_admin",
  "identity:get_project":
    "rule:cloud_reader or (role:reader and domain_id:%(target.project.domain_id)s) or project_id:%(target.project.id)s or role:role_viewer",
  "identity:list_projects":
    "rule:cloud_reader or (role:reader and domain_id:%(target.domain_id)s) or (role:reader and domain_id:%(domain_id)s) or (role:reader and project_id:%(parent_id)s)",
  "identity:create_project":
    "rule:cloud_admin or (role:admin and domain_id:%(target.project.domain_id)s) or (role:admin and project_id:%(target.project.parent_id)s) or user_domain_id:%(target.project.domain_id)s",
  "identity:update_project": "rule:cloud_admin or (role:admin and domain_id:%(target.project.domain_id)s)",
  "identity:delete_project":
    "(rule:cloud_admin or (rule:admin_required and (project_id:%(project_id)s or project_id:%(target.project.parent_id)s))) and (project_id:tempest-admin-project-123 or http://prodel-service.openstack.svc.cluster.local:8080/api/v1/validate-deletion)",
  "identity:get_user":
    "rule:cloud_reader or (role:reader and token.domain.id:%(target.user.domain_id)s) or user_id:%(target.user.id)s or role:role_viewer",
  "identity:list_users":
    "rule:cloud_reader or (role:reader and domain_id:%(target.domain_id)s) or project_domain_id:%(domain_id)s or user_domain_id:%(domain_id)s",
  "identity:create_user": "rule:cloud_admin or (role:admin and token.domain.id:%(target.user.domain_id)s)",
  "identity:update_user": "rule:cloud_admin or (role:admin and token.domain.id:%(target.user.domain_id)s)",
  "identity:delete_user": "rule:cloud_admin",
  "identity:check_grant": "rule:cloud_admin or rule:domain_admin_for_grants or rule:project_admin_for_grants",
  "identity:list_grants": "rule:cloud_admin or rule:domain_admin_for_list_grants or rule:project_admin_for_list_grants",
  "identity:create_grant": "rule:cloud_admin or rule:domain_admin_for_grants or rule:project_admin_for_grants",
  "identity:revoke_grant": "rule:cloud_admin or rule:domain_admin_for_grants or rule:project_admin_for_grants",
}

// Updated test tokens to match Keystone token structure
const adminToken = {
  roles: [{ id: "1", name: "admin" }],
  user: { id: "admin-user", name: "admin", domain: { id: "default", name: "Default" } },
  project: { id: "admin-project", name: "Admin Project", domain: { id: "default", name: "Default" } },
}

const systemAdminToken = {
  roles: [{ id: "1", name: "admin" }],
  user: { id: "system-admin-user", name: "admin", domain: { id: "default", name: "Default" } },
  system: { all: true },
}

const readerToken = {
  roles: [{ id: "2", name: "reader" }],
  user: { id: "reader-user", name: "reader", domain: { id: "default", name: "Default" } },
  project: { id: "reader-project", name: "Reader Project", domain: { id: "default", name: "Default" } },
}

const systemReaderToken = {
  roles: [{ id: "2", name: "reader" }],
  user: { id: "system-reader-user", name: "reader", domain: { id: "default", name: "Default" } },
  system: { all: true },
}

const serviceToken = {
  roles: [{ id: "3", name: "service" }],
  user: { id: "service-user", name: "service", domain: { id: "default", name: "Default" } },
  project: { id: "service-project", name: "Service Project", domain: { id: "default", name: "Default" } },
}

const cloudIdentityViewerToken = {
  roles: [{ id: "4", name: "cloud_identity_viewer" }],
  user: { id: "viewer-user", name: "viewer", domain: { id: "default", name: "Default" } },
  project: { id: "viewer-project", name: "Viewer Project", domain: { id: "default", name: "Default" } },
}

const roleAdminToken = {
  roles: [{ id: "5", name: "role_admin" }],
  user: { id: "role-admin-user", name: "role_admin", domain: { id: "default", name: "Default" } },
  project: { id: "role-admin-project", name: "Role Admin Project", domain: { id: "default", name: "Default" } },
}

const roleViewerToken = {
  roles: [{ id: "6", name: "role_viewer" }],
  user: { id: "role-viewer-user", name: "role_viewer", domain: { id: "default", name: "Default" } },
  project: { id: "role-viewer-project", name: "Role Viewer Project", domain: { id: "default", name: "Default" } },
}

const specialAdminToken = {
  roles: [{ id: "1", name: "admin" }],
  user: { id: "special-admin-user", name: "admin", domain: { id: "default", name: "Default" } },
  project: {
    id: "tempest-admin-project-123",
    name: "Tempest Admin Project",
    domain: { id: "default", name: "Default" },
  },
  is_admin_project: true,
}

// New token for testing regular admin (not cloud admin)
const regularAdminToken = {
  roles: [{ id: "1", name: "admin" }],
  user: { id: "regular-admin-user", name: "admin", domain: { id: "other-domain", name: "Other" } },
  project: { id: "regular-project", name: "Regular Project", domain: { id: "other-domain", name: "Other" } },
}

describe("Comprehensive Policy Engine Tests", () => {
  let engine: PolicyEngine

  beforeEach(() => {
    engine = new PolicyEngine(realPolicyConfig)
  })

  describe("Basic Rules", () => {
    describe("admin_required", () => {
      it("should allow admin role", () => {
        const policy = engine.policy(adminToken)
        expect(policy.check("admin_required")).toBe(true)
      })

      it("should deny reader role", () => {
        const policy = engine.policy(readerToken)
        expect(policy.check("admin_required")).toBe(false)
      })
    })

    describe("service_role", () => {
      it("should allow service role", () => {
        const policy = engine.policy(serviceToken)
        expect(policy.check("service_role")).toBe(true)
      })

      it("should deny admin role", () => {
        const policy = engine.policy(adminToken)
        expect(policy.check("service_role")).toBe(false)
      })
    })

    describe("service_or_admin", () => {
      it("should allow admin role", () => {
        const policy = engine.policy(adminToken)
        expect(policy.check("service_or_admin")).toBe(true)
      })

      it("should allow service role", () => {
        const policy = engine.policy(serviceToken)
        expect(policy.check("service_or_admin")).toBe(true)
      })

      it("should deny reader role", () => {
        const policy = engine.policy(readerToken)
        expect(policy.check("service_or_admin")).toBe(false)
      })
    })

    describe("owner", () => {
      it("should allow when user_id matches", () => {
        const policy = engine.policy(adminToken)
        expect(policy.check("owner", { user_id: "admin-user" })).toBe(true)
      })

      it("should deny when user_id doesn't match", () => {
        const policy = engine.policy(adminToken)
        expect(policy.check("owner", { user_id: "other-user" })).toBe(false)
      })
    })

    describe("token_subject", () => {
      it("should allow when target token user_id matches", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("token_subject", {
            target: { token: { user_id: "admin-user" } },
          })
        ).toBe(true)
      })

      it("should deny when target token user_id doesn't match", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("token_subject", {
            target: { token: { user_id: "other-user" } },
          })
        ).toBe(false)
      })
    })
  })

  describe("Complex Rules", () => {
    describe("cloud_admin", () => {
      it("should allow system scoped admin", () => {
        const policy = engine.policy(systemAdminToken)
        expect(policy.check("cloud_admin")).toBe(true)
      })

      it("should allow admin with is_admin_project", () => {
        const policy = engine.policy(specialAdminToken)
        expect(policy.check("cloud_admin")).toBe(true)
      })

      it("should allow admin with default domain", () => {
        const policy = engine.policy(adminToken)
        expect(policy.check("cloud_admin")).toBe(true)
      })

      it("should allow admin with tempest project", () => {
        const token = {
          ...adminToken,
          project: { ...adminToken.project, id: "tempest-admin-project-123" },
        }
        const policy = engine.policy(token)
        expect(policy.check("cloud_admin")).toBe(true)
      })

      it("should deny regular reader", () => {
        const policy = engine.policy(readerToken)
        expect(policy.check("cloud_admin")).toBe(false)
      })
    })

    describe("cloud_reader", () => {
      it("should allow system scoped reader", () => {
        const policy = engine.policy(systemReaderToken)
        expect(policy.check("cloud_reader")).toBe(true)
      })

      it("should allow cloud_identity_viewer role", () => {
        const policy = engine.policy(cloudIdentityViewerToken)
        expect(policy.check("cloud_reader")).toBe(true)
      })

      it("should allow service role", () => {
        const policy = engine.policy(serviceToken)
        expect(policy.check("cloud_reader")).toBe(true)
      })

      it("should allow cloud_admin", () => {
        const policy = engine.policy(systemAdminToken)
        expect(policy.check("cloud_reader")).toBe(true)
      })
    })
  })

  describe("Blocklist Rules", () => {
    describe("blocklist_roles", () => {
      const blocklistedRoles = [
        "resource_service",
        "cloud_registry_admin",
        "cloud_registry_viewer",
        "cloud_resource_admin",
        "cloud_resource_viewer",
        "cloud_masterdata_admin",
        "cloud_masterdata_viewer",
        "cloud_baremetal_admin",
        "cloud_network_admin",
        "cloud_dns_admin",
        "cloud_dns_viewer",
        "dns_admin",
        "dns_hostmaster",
        "dns_zonemaster",
        "dns_mailmaster",
        "cloud_image_admin",
        "cloud_compute_admin",
        "cloud_keymanager_admin",
        "cloud_volume_admin",
        "cloud_sharedfilesystem_admin",
        "cloud_sharedfilesystem_editor",
        "cloud_sharedfilesystem_viewer",
        "cloud_objectstore_admin",
        "cloud_objectstore_viewer",
        "service",
        "cloud_identity_viewer",
        "cloud_support_tools_viewer",
        "cloud_email_admin",
        "cloud_inventory_viewer",
      ]

      blocklistedRoles.forEach((roleName) => {
        it(`should block ${roleName} role`, () => {
          const policy = engine.policy(adminToken)
          expect(
            policy.check("blocklist_roles", {
              target: { role: { name: roleName } },
            })
          ).toBe(true)
        })
      })

      it("should allow non-blocklisted role", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("blocklist_roles", {
            target: { role: { name: "custom_role" } },
          })
        ).toBe(false)
      })
    })

    describe("blocklist_projects", () => {
      it("should block cloud-admin-project-456", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("blocklist_projects", {
            target: { project: { id: "cloud-admin-project-456" } },
          })
        ).toBe(true)
      })

      it("should allow other projects", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("blocklist_projects", {
            target: { project: { id: "other-project" } },
          })
        ).toBe(false)
      })
    })
  })

  describe("Grant Management Rules", () => {
    describe("domain_admin_for_grants", () => {
      it("should allow domain admin for global roles not in blocklist", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("domain_admin_for_grants", {
            target: {
              role: { domain_id: null, name: "custom_role" },
              project: { id: "allowed-project", domain_id: "default" },
            },
            domain_id: "default",
          })
        ).toBe(true)
      })

      it("should deny if role is blocklisted", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("domain_admin_for_grants", {
            target: {
              role: { domain_id: null, name: "service" },
              project: { id: "allowed-project", domain_id: "default" },
            },
            domain_id: "default",
          })
        ).toBe(false)
      })

      it("should deny if project is blocklisted", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("domain_admin_for_grants", {
            target: {
              role: { domain_id: null, name: "custom_role" },
              project: { id: "cloud-admin-project-456", domain_id: "default" },
            },
            domain_id: "default",
          })
        ).toBe(false)
      })
    })

    describe("project_admin_for_grants", () => {
      it("should allow project admin for global roles", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("project_admin_for_grants", {
            target: {
              role: { domain_id: null, name: "custom_role" },
              project: { parent_id: "admin-project" },
            },
            project_id: "admin-project",
          })
        ).toBe(true)
      })

      it("should allow role_admin for project grants", () => {
        const policy = engine.policy(roleAdminToken)
        expect(
          policy.check("project_admin_for_grants", {
            target: {
              role: { domain_id: null, name: "custom_role" },
              project: { parent_id: "role-admin-project" },
            },
            project_id: "role-admin-project",
          })
        ).toBe(true)
      })
    })
  })

  describe("Identity API Policies", () => {
    describe("Access Rules", () => {
      it("identity:get_access_rule - should allow cloud_reader", () => {
        const policy = engine.policy(systemReaderToken)
        expect(
          policy.check("identity:get_access_rule", {
            target: { user: { id: "other-user" } },
          })
        ).toBe(true)
      })

      it("identity:get_access_rule - should allow user for own access rule", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("identity:get_access_rule", {
            target: { user: { id: "admin-user" } },
          })
        ).toBe(true)
      })

      it("identity:delete_access_rule - should allow cloud_admin", () => {
        const policy = engine.policy(systemAdminToken)
        expect(
          policy.check("identity:delete_access_rule", {
            target: { user: { id: "other-user" } },
          })
        ).toBe(true)
      })
    })

    describe("Application Credentials", () => {
      it("identity:get_application_credential - should allow cloud_reader", () => {
        const policy = engine.policy(systemReaderToken)
        expect(policy.check("identity:get_application_credential")).toBe(true)
      })

      it("identity:get_application_credential - should allow owner", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("identity:get_application_credential", {
            user_id: "admin-user",
          })
        ).toBe(true)
      })

      it("identity:delete_application_credential - should allow cloud_admin", () => {
        const policy = engine.policy(systemAdminToken)
        expect(policy.check("identity:delete_application_credential")).toBe(true)
      })
    })

    describe("Domains", () => {
      it("identity:get_domain - should allow cloud_reader", () => {
        const policy = engine.policy(systemReaderToken)
        expect(policy.check("identity:get_domain")).toBe(true)
      })

      it("identity:get_domain - should allow token domain match", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("identity:get_domain", {
            target: { domain: { id: "default" } },
          })
        ).toBe(true)
      })

      it("identity:get_domain - should allow role_viewer", () => {
        const policy = engine.policy(roleViewerToken)
        expect(policy.check("identity:get_domain")).toBe(true)
      })

      it("identity:create_domain - should require cloud_admin", () => {
        const policy = engine.policy(systemAdminToken)
        expect(policy.check("identity:create_domain")).toBe(true)
      })

      it("identity:create_domain - should deny regular admin", () => {
        const policy = engine.policy(regularAdminToken)
        expect(policy.check("identity:create_domain")).toBe(false)
      })
    })

    describe("Projects", () => {
      it("identity:get_project - should allow cloud_reader", () => {
        const policy = engine.policy(systemReaderToken)
        expect(policy.check("identity:get_project")).toBe(true)
      })

      it("identity:get_project - should allow domain reader", () => {
        const policy = engine.policy(readerToken)
        expect(
          policy.check("identity:get_project", {
            target: { project: { domain_id: "default" } },
          })
        ).toBe(true)
      })

      it("identity:get_project - should allow project member", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("identity:get_project", {
            target: { project: { id: "admin-project" } },
          })
        ).toBe(true)
      })

      it("identity:create_project - should allow cloud_admin", () => {
        const policy = engine.policy(systemAdminToken)
        expect(policy.check("identity:create_project")).toBe(true)
      })

      it("identity:create_project - should allow domain admin", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("identity:create_project", {
            target: { project: { domain_id: "default" } },
          })
        ).toBe(true)
      })

      it("identity:delete_project - should allow for tempest project", () => {
        const tempestAdminToken = {
          ...systemAdminToken,
          project: {
            id: "tempest-admin-project-123",
            name: "Tempest Project",
            domain: { id: "default", name: "Default" },
          },
        }
        const policy = engine.policy(tempestAdminToken)
        expect(
          policy.check("identity:delete_project", {
            project_id: "tempest-admin-project-123",
          })
        ).toBe(true)
      })
    })

    describe("Users", () => {
      it("identity:get_user - should allow cloud_reader", () => {
        const policy = engine.policy(systemReaderToken)
        expect(policy.check("identity:get_user")).toBe(true)
      })

      it("identity:get_user - should allow domain reader", () => {
        const tokenWithDomain = {
          ...readerToken,
          domain: { id: "target-domain", name: "Target Domain" },
        }
        const policy = engine.policy(tokenWithDomain)
        expect(
          policy.check("identity:get_user", {
            target: { user: { domain_id: "target-domain" } },
          })
        ).toBe(true)
      })

      it("identity:get_user - should allow user for themselves", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("identity:get_user", {
            target: { user: { id: "admin-user" } },
          })
        ).toBe(true)
      })

      it("identity:create_user - should allow cloud_admin", () => {
        const policy = engine.policy(systemAdminToken)
        expect(policy.check("identity:create_user")).toBe(true)
      })

      it("identity:create_user - should allow domain admin", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("identity:create_user", {
            target: { user: { domain_id: "default" } },
          })
        ).toBe(true)
      })

      it("identity:delete_user - should require cloud_admin", () => {
        const policy = engine.policy(systemAdminToken)
        expect(policy.check("identity:delete_user")).toBe(true)
      })

      it("identity:delete_user - should deny domain admin", () => {
        const policy = engine.policy({ ...adminToken, domain: { id: "unknown", name: "Unknown" } })
        expect(policy.check("identity:delete_user")).toBe(false)
      })
    })

    describe("Grants", () => {
      it("identity:check_grant - should allow cloud_admin", () => {
        const policy = engine.policy(systemAdminToken)
        expect(policy.check("identity:check_grant")).toBe(true)
      })

      it("identity:create_grant - should allow domain_admin_for_grants", () => {
        const policy = engine.policy(adminToken)
        expect(
          policy.check("identity:create_grant", {
            target: {
              role: { domain_id: null, name: "custom_role" },
              project: { id: "allowed-project", domain_id: "default" },
            },
            domain_id: "default",
          })
        ).toBe(true)
      })

      it("identity:list_grants - should allow project admin", () => {
        const policy = engine.policy(roleViewerToken)
        expect(
          policy.check("identity:list_grants", {
            target: { project: { parent_id: "role-viewer-project" } },
            project_id: "role-viewer-project",
          })
        ).toBe(true)
      })
    })
  })

  describe("Edge Cases and Complex Scenarios", () => {
    it("should handle multiple role combinations", () => {
      const multiRoleToken = {
        ...adminToken,
        roles: [
          { id: "1", name: "admin" },
          { id: "2", name: "reader" },
          { id: "6", name: "role_viewer" },
        ],
      }
      const policy = engine.policy(multiRoleToken)
      expect(policy.check("cloud_admin")).toBe(true)
      expect(policy.check("cloud_reader")).toBe(true)
    })

    it("should handle missing token properties gracefully", () => {
      const incompleteToken = {
        roles: [{ id: "1", name: "admin" }],
        user: { id: "incomplete-user", name: "incomplete", domain: { id: "unknown", name: "Unknown" } },
      }
      const policy = engine.policy(incompleteToken)
      expect(policy.check("admin_required")).toBe(true)
      expect(policy.check("cloud_admin")).toBe(false) // requires domain or project info
    })

    it("should handle nested rule dependencies", () => {
      const policy = engine.policy(adminToken)
      // Test that domain_admin_for_grants properly evaluates its complex dependencies
      expect(
        policy.check("domain_admin_for_grants", {
          target: {
            role: { domain_id: "default", name: "custom_role" },
            project: { id: "allowed-project", domain_id: "default" },
          },
          domain_id: "default",
        })
      ).toBe(true)
    })

    it("should handle parent-child project relationships", () => {
      const policy = engine.policy(adminToken)
      expect(
        policy.check("identity:create_project", {
          target: { project: { parent_id: "admin-project" } },
        })
      ).toBe(true)
    })

    it("should properly evaluate None checks", () => {
      const policy = engine.policy(adminToken)
      expect(
        policy.check("domain_admin_for_global_role_grants", {
          target: {
            role: { domain_id: null },
            project: { domain_id: "default" },
          },
          domain_id: "default",
        })
      ).toBe(true)
    })
  })

  describe("Error Handling", () => {
    it("should handle missing target properties", () => {
      const policy = engine.policy(adminToken)
      expect(() => policy.check("identity:get_user", {})).not.toThrow()
    })

    it("should handle undefined rule references", () => {
      const policy = engine.policy(adminToken)
      expect(() => policy.check("nonexistent_rule")).toThrow()
    })
  })
})
