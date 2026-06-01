import type { MessageDescriptor } from "@lingui/core"
import { msg } from "@lingui/core/macro"

export interface ValidationError {
  type: "required" | "invalid-chars" | "whitespace" | "duplicate" | "too-long" | "slashes"
  message: MessageDescriptor
}

/**
 * Validates folder names for inline folder creation in object browser
 * Used in Copy/Move/Create folder modals
 */
export const validateFolderName = (
  name: string,
  existingNames: string[],
  currentPrefix = ""
): ValidationError | null => {
  const trimmed = name.trim()

  if (!trimmed) {
    return {
      type: "required",
      message: msg`Folder name is required`,
    }
  }

  if (trimmed.includes("/")) {
    return {
      type: "slashes",
      message: msg`Folder name cannot contain slashes`,
    }
  }

  if (trimmed !== name) {
    return {
      type: "whitespace",
      message: msg`Folder name cannot have leading or trailing whitespace`,
    }
  }

  if (trimmed.length > 255) {
    return {
      type: "too-long",
      message: msg`Folder name is too long (max 255 characters)`,
    }
  }

  // Check against existing folders at current level
  const newPath = `${currentPrefix}${trimmed}/`
  if (existingNames.includes(newPath)) {
    return {
      type: "duplicate",
      message: msg`A folder with this name already exists`,
    }
  }

  return null
}

/**
 * Validates object names for rename/move operations
 */
export const validateObjectName = (name: string): ValidationError | null => {
  const trimmed = name.trim()

  if (!trimmed) {
    return {
      type: "required",
      message: msg`Object name is required`,
    }
  }

  if (trimmed.includes("/")) {
    return {
      type: "slashes",
      message: msg`Object name cannot contain slashes`,
    }
  }

  if (trimmed !== name) {
    return {
      type: "whitespace",
      message: msg`Object name cannot have leading or trailing whitespace`,
    }
  }

  return null
}

/**
 * Validates metadata keys for S3 custom metadata
 * S3 requires: alphanumeric, hyphen, underscore only
 */
export const validateMetadataKey = (key: string): ValidationError | null => {
  const VALID_KEY_RE = /^[a-zA-Z0-9_-]+$/

  if (!key.trim()) {
    return {
      type: "required",
      message: msg`Key is required`,
    }
  }

  if (!VALID_KEY_RE.test(key)) {
    return {
      type: "invalid-chars",
      message: msg`Key contains invalid characters (use only letters, digits, hyphens, underscores)`,
    }
  }

  if (!/[a-zA-Z0-9]/.test(key)) {
    return {
      type: "invalid-chars",
      message: msg`Key must contain at least one alphanumeric character`,
    }
  }

  return null
}
