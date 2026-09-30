import { TRPCError } from "@trpc/server"
import {
  ec2CredentialSchema,
  ec2CredentialWithSecretSchema,
  type Ec2Credential,
  type Ec2CredentialWithSecret,
} from "../types/ceph"

/**
 * The parts of Keystone's credential object these mappers read. Declared structurally rather
 * than imported from the router so the helper doesn't depend on its caller; the router's
 * `RawCredential` satisfies it.
 */
export interface RawEc2Credential {
  id: string
  project_id: string
  blob: string
  user_id: string
}

/**
 * Turn one Keystone credential into the shape this domain hands out.
 *
 * Keystone stores the access key and the secret as a JSON *string* in `blob`, so every read path
 * has to parse it and then check that what came out is what we expect. That was written out
 * three times in `ec2CredentialRouter` - `list`, `create` and `reveal` - differing only in the
 * wording of the errors, which is the kind of duplication `Storage/helpers/` exists to absorb
 * (`lifecycleMapper`, `s3ErrorMapper`).
 *
 * Both failures - unparseable JSON and a parsed object that doesn't fit the schema - are
 * `INTERNAL_SERVER_ERROR`: the caller asked for something reasonable and the identity service
 * answered with something we can't read, which is not the caller's fault to fix. The credential
 * id is named so an operator can find the offending record; nothing from the blob is, because
 * that is where the secret lives.
 */
export function toEc2Credential(raw: RawEc2Credential): Ec2Credential {
  const blob = parseBlob(raw)

  const result = ec2CredentialSchema.safeParse({
    id: raw.id,
    access: blob.access,
    user_id: raw.user_id,
    project_id: raw.project_id,
  })

  if (!result.success) {
    throw invalidFormat(raw.id)
  }

  return result.data
}

/**
 * Same as {@link toEc2Credential}, for the two paths that are allowed to hand the secret back:
 * `create` (which returns the key it just made) and `reveal`.
 */
export function toEc2CredentialWithSecret(raw: RawEc2Credential): Ec2CredentialWithSecret {
  const blob = parseBlob(raw)

  const result = ec2CredentialWithSecretSchema.safeParse({
    id: raw.id,
    access: blob.access,
    secret: blob.secret,
    user_id: raw.user_id,
    project_id: raw.project_id,
  })

  if (!result.success) {
    throw invalidFormat(raw.id)
  }

  return result.data
}

function parseBlob(raw: RawEc2Credential): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw.blob)
  } catch {
    throw parseFailed(raw.id)
  }

  // `"null"`, `"42"` and `"[]"` all parse fine and would then be read for `.access` - null
  // throwing a TypeError out of this helper, the others quietly producing `undefined`. The
  // previous inline version happened to catch the TypeError because its `try` wrapped the field
  // reads too; this says what it means instead.
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw parseFailed(raw.id)
  }

  return parsed as Record<string, unknown>
}

function parseFailed(credentialId: string): TRPCError {
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Failed to parse EC2 credential blob for credential ${credentialId}`,
  })
}

function invalidFormat(credentialId: string): TRPCError {
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `Invalid EC2 credential format for credential ${credentialId}`,
  })
}
