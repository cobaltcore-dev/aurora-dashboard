import { z } from "zod"

// Base identity schema (must have exactly one auth method)
const IdentitySchema = z.object({
  methods: z.array(z.enum(["password", "token", "application_credential"])).length(1),
})

// Password authentication schema (supports both `id` and `name + domain.name`)
const PasswordAuthSchema = IdentitySchema.extend({
  methods: z.tuple([z.literal("password")]),
  password: z.object({
    user: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        domain: z
          .object({
            name: z.string().optional(),
            id: z.string().optional(),
          })
          .optional()
          .refine((domain) => !domain || domain.name || domain.id, {
            message: "If 'domain' is provided, either 'domain.name' or 'domain.id' must be provided.",
          }),
        password: z.string().min(1, "Password is required."),
      })
      .refine((data) => data.id || (data.name && data.domain?.name), {
        message: "Either 'id' OR ('name' + 'domain.name') must be provided.",
      }),
  }),
})

// Token authentication schema
const TokenAuthSchema = IdentitySchema.extend({
  methods: z.tuple([z.literal("token")]),
  token: z.object({
    id: z.string().min(1, "Token ID is required."),
  }),
})

// Application Credential authentication schema
const AppCredentialAuthSchema = IdentitySchema.extend({
  methods: z.tuple([z.literal("application_credential")]),
  application_credential: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      secret: z.string().min(1, "Application credential secret is required."),
      user: z
        .object({
          id: z.string().min(1, "User ID is required."),
        })
        .optional(),
    })
    .refine((data) => data.id || data.name, {
      message: "Either 'id' or 'name' must be provided for application credentials.",
    }),
})

// Scope validation (system or project)
const ScopeSchema = z.union([
  // System scope (all: boolean)
  z.object({
    system: z.object({
      all: z.boolean(),
    }),
  }),
  // Project scope with name & domain (domain name)
  z.object({
    project: z.object({
      name: z.string().min(1, "Project name is required."),
      domain: z.object({
        name: z.string().min(1, "Domain name is required."),
      }),
    }),
  }),
  // Project scope with name & domain (domain ID)
  z.object({
    project: z.object({
      name: z.string().min(1, "Project name is required."),
      domain: z.object({
        id: z.string().min(1, "Domain ID is required."),
      }),
    }),
  }),
  // Project scope with only ID
  z.object({
    project: z.object({
      id: z.string().min(1, "Project ID is required."),
    }),
  }),
  // Unscoped authentication as a string
  z.literal("unscoped"),
])

// Full authentication schema
export const AuthSchema = z.object({
  auth: z.object({
    identity: z.union([PasswordAuthSchema, TokenAuthSchema, AppCredentialAuthSchema]),
    scope: ScopeSchema.optional(), // Scope is optional but must be valid if provided
  }),
})

// Infer TypeScript type
export type AuthConfig = z.infer<typeof AuthSchema>
