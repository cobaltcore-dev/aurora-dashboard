import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { randomBytes } from "crypto"
import { projectScopedProcedure, projectScopedInputSchema } from "../../../trpc"
import {
  ec2CredentialSchema,
  ec2CredentialWithSecretSchema,
  type Ec2Credential,
  type Ec2CredentialWithSecret,
} from "../../types/ceph"

// ============================================================================
// INTERNAL TYPES (raw Identity API response shapes)
// ============================================================================

interface RawCredential {
  id: string
  type: string
  project_id: string
  blob: string
  user_id: string
}

interface CredentialsListResponse {
  credentials: RawCredential[]
}

interface CredentialCreateResponse {
  credential: RawCredential
}

interface CredentialBlob {
  access: string
  secret: string
}

// ============================================================================
// EC2 CREDENTIAL ROUTER
// ============================================================================

export const ec2CredentialRouter = {
  /**
   * Lists EC2 credentials for the current user scoped to the given project.
   * The secret key is never returned — only the access key ID.
   */
  list: projectScopedProcedure
    .input(projectScopedInputSchema)
    .query(async ({ ctx, input }): Promise<Ec2Credential[]> => {
      const userId = ctx.openstack.getToken()?.tokenData.user?.id
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID not found in token" })
      }

      const identityService = ctx.openstack.service("identity")
      const response = await identityService.get("credentials", {
        queryParams: { user_id: userId, type: "ec2" },
      })

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list EC2 credentials",
        })
      }

      const data: CredentialsListResponse = await response.json()
      const ec2Creds = (data.credentials ?? []).filter((c) => c.type === "ec2" && c.project_id === input.project_id)

      return ec2Creds.map((c) => {
        try {
          const blob: CredentialBlob = JSON.parse(c.blob)
          const result = ec2CredentialSchema.safeParse({
            id: c.id,
            access: blob.access,
            user_id: c.user_id,
            project_id: c.project_id,
          })
          if (!result.success) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Invalid EC2 credential format for credential ${c.id}`,
            })
          }
          return result.data
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to parse EC2 credential blob for credential ${c.id}`,
          })
        }
      })
    }),

  /**
   * Creates a new EC2 credential for the current user scoped to the given project.
   * The secret key is returned exactly once in this response and never stored.
   */
  create: projectScopedProcedure
    .input(projectScopedInputSchema)
    .mutation(async ({ ctx, input }): Promise<Ec2CredentialWithSecret> => {
      const userId = ctx.openstack.getToken()?.tokenData.user?.id
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID not found in token" })
      }

      const identityService = ctx.openstack.service("identity")
      const access = randomBytes(20).toString("hex").toUpperCase()
      const secret = randomBytes(40).toString("base64")
      const response = await identityService.post(
        "credentials",
        JSON.stringify({
          credential: {
            type: "ec2",
            project_id: input.project_id,
            user_id: userId,
            blob: JSON.stringify({ access, secret }),
          },
        })
      )

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create EC2 credentials. Please try again or contact your administrator.",
        })
      }

      const data: CredentialCreateResponse = await response.json()

      try {
        const blob: CredentialBlob = JSON.parse(data.credential.blob)
        const result = ec2CredentialWithSecretSchema.safeParse({
          id: data.credential.id,
          access: blob.access,
          secret: blob.secret,
          user_id: data.credential.user_id,
          project_id: data.credential.project_id,
        })
        if (!result.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Created credential has invalid format",
          })
        }
        return result.data
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse created credential response",
        })
      }
    }),

  /**
   * Deletes an EC2 credential by ID.
   */
  delete: projectScopedProcedure
    .input(
      projectScopedInputSchema.extend({
        credentialId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }): Promise<{ success: true }> => {
      const userId = ctx.openstack.getToken()?.tokenData.user?.id
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID not found in token" })
      }

      const identityService = ctx.openstack.service("identity")
      const response = await identityService.del(`credentials/${input.credentialId}`)

      if (!response.ok && response.status !== 404) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete EC2 credential",
        })
      }

      return { success: true }
    }),
}
