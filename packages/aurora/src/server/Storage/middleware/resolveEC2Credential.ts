import type { AuroraPortalContext } from "../../context"

export interface Ec2CredentialResult {
  credentialId: string
  access: string
  secret: string
}

interface RawCredential {
  id: string
  type: string
  project_id: string
  blob: string
}

interface CredentialsResponse {
  credentials: RawCredential[]
}

interface CredentialBlob {
  access: string
  secret: string
}

/**
 * Checks OpenStack Identity API for an existing EC2 credential scoped to the
 * current user + project. Returns the credential if found, null otherwise.
 * Never creates credentials — creation is handled by the tRPC router.
 */
export async function resolveEC2Credential(ctx: AuroraPortalContext): Promise<Ec2CredentialResult | null> {
  const token = ctx.openstack?.getToken()
  const userId = token?.tokenData.user?.id
  const projectId = token?.tokenData.project?.id

  if (!userId || !projectId) {
    return null
  }

  const identityService = ctx.openstack?.service("identity")
  if (!identityService) {
    return null
  }

  try {
    const response = await identityService.get("credentials", {
      queryParams: { user_id: userId, type: "ec2" },
    })
    if (!response.ok) {
      return null
    }

    const data: CredentialsResponse = await response.json()
    // A user may now hold up to EC2_CREDENTIALS_MAX_PER_PROJECT credentials in this
    // project (see ec2CredentialRouter.create), so more than one match is possible here.
    // Keystone's credential object carries no timestamp (`RawCredential` is only `id`,
    // `type`, `project_id`, `blob`), so "oldest"/"newest" cannot be computed — there is no
    // "correct" key to prefer. Sorting by `id` doesn't pick the "right" credential, only
    // the SAME one on every request, which is all that's needed: before this feature a
    // second key could never exist, so Keystone's (unspecified) response order never
    // mattered.
    const ec2Creds = (data.credentials ?? [])
      .filter((c) => c.type === "ec2" && c.project_id === projectId)
      .sort((a, b) => a.id.localeCompare(b.id))
    const ec2Cred = ec2Creds[0]

    if (!ec2Cred) {
      return null
    }

    const blob: CredentialBlob = JSON.parse(ec2Cred.blob)
    return { credentialId: ec2Cred.id, access: blob.access, secret: blob.secret }
  } catch (error) {
    console.error("[s3] Failed to resolve EC2 credential:", error)
    return null
  }
}
