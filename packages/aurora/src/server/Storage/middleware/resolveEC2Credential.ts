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
    const ec2Cred = data.credentials?.find((c) => c.type === "ec2" && c.project_id === projectId)

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
