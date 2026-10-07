import { msg } from "@lingui/core/macro"
import { MessageDescriptor } from "@lingui/core"

// Neutron limits: NAME_FIELD_SIZE / DESCRIPTION_FIELD_SIZE (neutron_lib.db.constants)
export const SECURITY_GROUP_NAME_MAX_LENGTH = 255
export const SECURITY_GROUP_DESCRIPTION_MAX_LENGTH = 255

export type SecurityGroupFormField = "name" | "description"
export type SecurityGroupFieldErrors = Partial<Record<SecurityGroupFormField, string>>

export const validateSecurityGroupField = (
  field: SecurityGroupFormField,
  value: string,
  t: (descriptor: MessageDescriptor) => string,
  /** Name the group already has (Edit): keeping it is never an error, even if it is "default" */
  originalName?: string | null
): string | undefined => {
  const trimmed = value.trim()

  switch (field) {
    case "name":
      if (!trimmed) return t(msg`Security group name is required`)
      if (trimmed.length > SECURITY_GROUP_NAME_MAX_LENGTH) return t(msg`Name must be at most 255 characters long.`)
      // Neutron rejects "default" (case-insensitive): it is reserved for the project's default group
      if (trimmed.toLowerCase() === "default" && trimmed !== originalName?.trim())
        return t(msg`The name "default" is reserved for the default security group.`)
      return undefined

    case "description":
      if (trimmed.length > SECURITY_GROUP_DESCRIPTION_MAX_LENGTH)
        return t(msg`Description must be at most 255 characters long.`)
      return undefined

    default:
      return undefined
  }
}
