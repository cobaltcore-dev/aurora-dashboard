import type { ShareSnapshot } from "@/server/SharedFileSystem/types/snapshot"
import { SHARE_PROTOCOL_LABELS } from "@/client/routes/_auth/projects/$projectId/shared-file-system/-components/shareListFilters"

/**
 * Returns the display name for a share snapshot, falling back to its ID.
 */
export function getShareSnapshotDisplayName(snapshot: Pick<ShareSnapshot, "id" | "name">): string {
  return snapshot.name?.trim() || snapshot.id
}

/**
 * Returns the protocol label for a share snapshot, or the raw value if unknown, or undefined if missing.
 */
export function getShareSnapshotProtocolLabel(proto: string | null | undefined): string | undefined {
  if (!proto || !proto.trim()) return undefined

  const normalized = proto.toLowerCase()
  const protocolKey = normalized as keyof typeof SHARE_PROTOCOL_LABELS

  if (SHARE_PROTOCOL_LABELS[protocolKey]) {
    return SHARE_PROTOCOL_LABELS[protocolKey]
  }

  return proto.trim()
}
