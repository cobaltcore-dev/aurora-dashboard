import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { randomBytes } from "crypto"
import { projectScopedProcedure, projectScopedInputSchema } from "../../../trpc"
import type { AuroraPortalContext } from "../../../context"
import { toEc2Credential, toEc2CredentialWithSecret } from "../../helpers/ec2CredentialMapper"
import { ec2CredentialIdInputSchema, type Ec2Credential, type Ec2CredentialWithSecret } from "../../types/ceph"
import { EC2_CREDENTIALS_MAX_PER_PROJECT, EC2_CREDENTIAL_LIMIT_REACHED } from "../../constants"

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

/** Context shape inside a `projectScopedProcedure` handler: `openstack` is guaranteed set. */
type ProjectScopedContext = AuroraPortalContext & { openstack: NonNullable<AuroraPortalContext["openstack"]> }

/**
 * Fetches one credential and verifies it belongs to the caller.
 *
 * Both user_id and project_id come from the (already rescoped) token, never from input —
 * that is what makes the check an authorization check and not a filter the caller controls.
 * When this check is the one that rejects, it answers NOT_FOUND rather than FORBIDDEN, so its
 * answer alone can't be used to confirm that a credential ID exists (IDOR hardening, #1182).
 *
 * That is the guarantee, and it is narrower than "existence is never observable". It only holds
 * for credentials Keystone lets us read in the first place. Under the modern default policy
 * (`identity:get_credential` = `user_id:%target.credential.user_id%`) Keystone refuses another
 * user's credential itself: a nonexistent id comes back 404 and becomes NOT_FOUND here, an
 * existing one someone else owns comes back 403 and becomes FORBIDDEN — distinguishable, and
 * deliberately left that way. Folding 403 into NOT_FOUND would close nothing, because the same
 * two answers are what Keystone gives any holder of that token directly, and it would make a
 * genuinely misconfigured `identity:get_credential` rule look like an empty account instead of a
 * permission problem an operator can find.
 *
 * Only `type: "ec2"` credentials are in scope. A user's Keystone account can hold credentials of
 * other types in the same project, and this router presents itself as S3 access-key management —
 * so anything else is reported the same way a missing credential is, rather than being deleted or
 * parsed as an EC2 blob.
 *
 * Returns null when the credential isn't there (or isn't an EC2 one), letting the caller choose
 * its own semantics: `delete` treats it as idempotent success, `reveal` as NOT_FOUND.
 */
async function fetchOwnedCredential(ctx: ProjectScopedContext, credentialId: string): Promise<RawCredential | null> {
  const userId = ctx.openstack.getToken()?.tokenData.user?.id
  const projectId = ctx.openstack.getToken()?.tokenData.project?.id

  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID not found in token" })
  }

  if (!projectId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Project ID not found in token" })
  }

  const identityService = ctx.openstack.service("identity")

  // 1. Fetch credential to verify ownership.
  //    signal-openstack's `request()` rejects with SignalOpenstackApiError on every non-2xx
  //    answer instead of resolving with `ok: false` (client.ts), so "no such credential"
  //    arrives here as a throw. The `!ok` branch below covers identity service implementations
  //    that resolve instead; both shapes mean the same thing at this point.
  let getResponse
  try {
    getResponse = await identityService.get(`credentials/${credentialId}`)
  } catch (error) {
    if (error instanceof SignalOpenstackApiError && error.statusCode === 404) {
      return null
    }
    throw error
  }

  if (!getResponse.ok) {
    if (getResponse.status === 404) {
      // Not there — the caller decides what that means.
      return null
    }
    if (getResponse.status === 401) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication failed" })
    }
    if (getResponse.status === 403) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" })
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to fetch credential for verification",
    })
  }

  const credentialData: { credential: RawCredential } = await getResponse.json()
  const credential = credentialData.credential

  // 2. Verify ownership - return NOT_FOUND to prevent enumeration
  if (credential.user_id !== userId || credential.project_id !== projectId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Credential not found",
    })
  }

  // 3. Not an EC2 credential: outside this router's remit, same answer as "not there".
  if (credential.type !== "ec2") {
    return null
  }

  return credential
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

      return ec2Creds.map(toEc2Credential)
    }),

  /**
   * Creates a new EC2 credential for the current user scoped to the given project.
   * The secret key is returned exactly once in this response and never stored.
   *
   * Enforces EC2_CREDENTIALS_MAX_PER_PROJECT: once a user already holds that many
   * credentials in this project, creation is refused with CONFLICT/EC2_CREDENTIAL_LIMIT_REACHED.
   */
  create: projectScopedProcedure
    .input(projectScopedInputSchema)
    .mutation(async ({ ctx, input }): Promise<Ec2CredentialWithSecret> => {
      const userId = ctx.openstack.getToken()?.tokenData.user?.id
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User ID not found in token" })
      }

      const identityService = ctx.openstack.service("identity")

      const listResponse = await identityService.get("credentials", {
        queryParams: { user_id: userId, type: "ec2" },
      })
      if (!listResponse.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify the existing credential count",
        })
      }
      const existing: CredentialsListResponse = await listResponse.json()
      const existingForProject = (existing.credentials ?? []).filter(
        (c) => c.type === "ec2" && c.project_id === input.project_id
      )
      if (existingForProject.length >= EC2_CREDENTIALS_MAX_PER_PROJECT) {
        throw new TRPCError({ code: "CONFLICT", message: EC2_CREDENTIAL_LIMIT_REACHED })
      }

      // Check-then-create, not atomic: Keystone offers no uniqueness/count constraint on
      // credentials, so two concurrent creates can both pass this check and leave three keys.
      // Deliberately not compensated by deleting the key we just made — all of a user's keys
      // in a project map to the same RGW identity, so one extra key grants nothing and costs
      // no quota, while a destructive rollback on a race is a strictly worse failure mode.
      // The UI additionally disables Create at the limit.

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

      return toEc2CredentialWithSecret(data.credential)
    }),

  /**
   * Returns one credential including its secret key.
   *
   * EC2 credentials in Keystone are reversible by design: the blob is stored encrypted and
   * decrypted on every read, so `GET /v3/credentials/{id}` hands back {"access","secret"}.
   * This is NOT an Application Credential (whose secret is hashed and unrecoverable) — the
   * BFF already reads this exact secret on every single Ceph request
   * (`middleware/resolveEC2Credential.ts`), so exposing it to its own owner adds no new
   * disclosure surface.
   *
   * Modelled as a mutation rather than a query on purpose: a tRPC query result lands in the
   * TanStack Query cache, where the secret would survive the modal being closed and show up
   * in devtools. Mutation results never enter the query cache and are dropped by reset().
   * Same trick as `objects.generatePresignedUrl`.
   */
  reveal: projectScopedProcedure
    .input(ec2CredentialIdInputSchema)
    .mutation(async ({ ctx, input }): Promise<Ec2CredentialWithSecret> => {
      const credential = await fetchOwnedCredential(ctx, input.credentialId)
      if (!credential) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Credential not found" })
      }

      return toEc2CredentialWithSecret(credential)
    }),

  /**
   * Deletes an EC2 credential by ID.
   * Verifies ownership before deletion to prevent IDOR attacks.
   */
  delete: projectScopedProcedure
    .input(ec2CredentialIdInputSchema)
    .mutation(async ({ ctx, input }): Promise<{ success: true }> => {
      const credential = await fetchOwnedCredential(ctx, input.credentialId)
      if (!credential) {
        // Already gone (or never existed): idempotent delete is success.
        return { success: true }
      }

      const identityService = ctx.openstack.service("identity")

      try {
        const deleteResponse = await identityService.del(`credentials/${input.credentialId}`)

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete EC2 credential",
          })
        }
      } catch (error) {
        // Deleted by someone else between the ownership check and this call — still success.
        if (error instanceof SignalOpenstackApiError && error.statusCode === 404) {
          return { success: true }
        }
        throw error
      }

      return { success: true }
    }),
}
