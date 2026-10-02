import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { randomBytes } from "crypto"
import { projectScopedProcedure, projectScopedInputSchema } from "../../../trpc"
import type { AuroraPortalContext } from "../../../context"
import { toEc2Credential, toEc2CredentialWithSecret } from "../../helpers/ec2CredentialMapper"
import { ec2CredentialIdInputSchema, type Ec2Credential, type Ec2CredentialWithSecret } from "../../types/ceph"

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
 * Rejects with the answer the identity service's own status calls for, so one Keystone status does
 * not come to mean two different things depending on which call produced it. Reached from both
 * shapes a refusal can arrive in - a thrown SignalOpenstackApiError, which is what the real client
 * produces, and a resolved non-ok response - and from both procedures that talk to Keystone.
 *
 * 404 is not handled here: what "not there" means is the caller's decision, and both of them make
 * it right before calling this, in the one line where it reads as a decision.
 *
 * `whatFailed` names the call for the one answer that has nothing to report but our own failure.
 * It is not decoration: the client prints this message verbatim in a toast, so a shared sentence
 * would have a failed delete explain itself as a credential it could not read for verification -
 * an operation that had already succeeded by then.
 */
function rejectForIdentityStatus(status: number | undefined, whatFailed: string): never {
  if (status === 401) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication failed" })
  }
  if (status === 403) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" })
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: whatFailed })
}

function credentialNotFound(): TRPCError {
  return new TRPCError({ code: "NOT_FOUND", message: "Credential not found" })
}

/**
 * Fetches one credential and verifies it belongs to the caller.
 *
 * What the identity service answers is what the caller gets: 404 means "no such credential", 403
 * a permission problem, 401 an authentication one. This router does not rewrite one into another,
 * and under the modern default policy (`identity:get_credential` =
 * `user_id:%target.credential.user_id%`) that is the whole story - Keystone refuses another user's
 * credential itself, and its refusal is what travels back. Rewriting a 403 into NOT_FOUND would
 * hide nothing anyway (`ctx.openstack` is the caller's own rescoped session, so the same request
 * answers them the same way made directly) while making a misconfigured rule look like an empty
 * account rather than the permission problem an operator can go and fix.
 *
 * One answer this function decides for itself: a credential the identity service *does* return but
 * whose user_id or project_id is not the caller's. That happens on a permissive legacy policy
 * (`admin_or_owner` with a broad token), and here "do what the backend does" would mean handing
 * over somebody else's secret, so it is refused instead - never parsed, never returned. The
 * refusal is NOT_FOUND rather than FORBIDDEN (IDOR hardening, #1182); worth knowing that this
 * conceals less than it looks, for the same reason as above - the caller holds the token that
 * would answer the question directly.
 *
 * Both ids come from the (already rescoped) token, never from input - that is what makes the
 * check an authorization check and not a filter the caller controls.
 *
 * Only `type: "ec2"` credentials are in scope. A user's Keystone account can hold credentials of
 * other types in the same project, and this router presents itself as S3 access-key management —
 * so anything else is reported the same way a missing credential is, rather than being deleted or
 * parsed as an EC2 blob.
 *
 * Returns null when the credential isn't there (or isn't an EC2 one). Both callers answer that
 * with NOT_FOUND - `delete` as well, which is deliberate: see its own docblock.
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
  //    signal-openstack's `request()` rejects with SignalOpenstackApiError on every non-2xx answer
  //    instead of resolving with `ok: false` (client.ts), so this is the path every refusal from
  //    the identity service actually takes - the `!ok` branch below is for identity service
  //    implementations that resolve instead. Both shapes carry the same status and are translated
  //    the same way, which is the point: the status the service answered with is the one the
  //    caller sees.
  let getResponse
  try {
    getResponse = await identityService.get(`credentials/${credentialId}`)
  } catch (error) {
    if (error instanceof SignalOpenstackApiError) {
      // Not there - the caller decides what that means.
      if (error.statusCode === 404) {
        return null
      }
      rejectForIdentityStatus(error.statusCode, "Failed to fetch credential for verification")
    }
    throw error
  }

  if (!getResponse.ok) {
    if (getResponse.status === 404) {
      return null
    }
    rejectForIdentityStatus(getResponse.status, "Failed to fetch credential for verification")
  }

  const credentialData: { credential: RawCredential } = await getResponse.json()
  const credential = credentialData.credential

  // 2. Verify ownership - return NOT_FOUND to prevent enumeration
  if (credential.user_id !== userId || credential.project_id !== projectId) {
    throw credentialNotFound()
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
   *
   * The secret is generated here and handed to Keystone, but deliberately not returned: the UI
   * shows a new key concealed like any other and reads it through `reveal`, so a secret in this
   * response would be a value crossing the wire that nothing consumes. `reveal` remains the one
   * procedure that hands a secret out.
   *
   * No ceiling on how many a user may hold: neither Keystone nor RGW imposes one, and all of a
   * user's keys in a project map to the same RGW identity, so an extra key grants no extra access
   * and costs no quota. A limit here would only be this router refusing what the backend allows.
   */
  create: projectScopedProcedure
    .input(projectScopedInputSchema)
    .mutation(async ({ ctx, input }): Promise<Ec2Credential> => {
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

      return toEc2Credential(data.credential)
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
   * Modelled as a mutation rather than a query on purpose: a query is the shape React Query
   * caches by default, and a secret in that cache would outlive the modal that asked for it and
   * show up in devtools. Same trick as `objects.generatePresignedUrl`. A mutation is not a cache
   * guarantee on its own, though - `useMutation` keeps its answer in the MutationCache for
   * `gcTime` after the observer lets go - so the client calls this one through the vanilla tRPC
   * client, which caches nothing. See `ManageCredentialsModal`.
   */
  reveal: projectScopedProcedure
    .input(ec2CredentialIdInputSchema)
    .mutation(async ({ ctx, input }): Promise<Ec2CredentialWithSecret> => {
      const credential = await fetchOwnedCredential(ctx, input.credentialId)
      if (!credential) {
        throw credentialNotFound()
      }

      return toEc2CredentialWithSecret(credential)
    }),

  /**
   * Deletes an EC2 credential by ID.
   * Verifies ownership before deletion to prevent IDOR attacks.
   *
   * Deliberately NOT idempotent: a credential that is not there answers NOT_FOUND rather than
   * success. Reporting a deletion this procedure did not perform is a lie the UI then repeats in a
   * toast naming a key nobody deleted, and it hides the one case worth seeing — someone else
   * removing that key while this screen was open. The caller is told what the identity service
   * actually said, and the UI refreshes the list either way, so the table stops showing the key
   * regardless of which answer came back.
   *
   * NOT_FOUND here is the same answer `fetchOwnedCredential` gives for a credential owned by
   * somebody else, which keeps the two indistinguishable (the anti-enumeration property from
   * #1182) — it is not weakened by this change, only extended to one more case.
   */
  delete: projectScopedProcedure
    .input(ec2CredentialIdInputSchema)
    .mutation(async ({ ctx, input }): Promise<{ success: true }> => {
      const credential = await fetchOwnedCredential(ctx, input.credentialId)
      if (!credential) {
        throw credentialNotFound()
      }

      const identityService = ctx.openstack.service("identity")

      // `signal-openstack`'s `request()` rejects on every non-2xx rather than resolving with
      // `ok: false` (client.ts), so a 404 arrives here as a throw. The `!ok` branch below covers
      // identity service implementations that resolve instead; both mean the same thing.
      let deleteResponse
      try {
        deleteResponse = await identityService.del(`credentials/${input.credentialId}`)
      } catch (error) {
        // Translated the same way as the read above, so a Keystone status means the same thing
        // whichever call produced it. A 404 here is a credential someone else deleted between the
        // ownership check and this call.
        if (error instanceof SignalOpenstackApiError) {
          if (error.statusCode === 404) {
            throw credentialNotFound()
          }
          rejectForIdentityStatus(error.statusCode, "Failed to delete EC2 credential")
        }
        throw error
      }

      if (!deleteResponse.ok) {
        if (deleteResponse.status === 404) {
          throw credentialNotFound()
        }
        rejectForIdentityStatus(deleteResponse.status, "Failed to delete EC2 credential")
      }

      return { success: true }
    }),
}
