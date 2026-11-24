/**
 * Filter values of the shares list, shared by the route's search validation and the list's filter UI.
 * Defined on the client: value imports from server type files would pull server code into the browser bundle.
 */

export const SHARE_FILTER_OTHER = "other"

// Documented Manila share statuses from API ref, alphabetical
export const SHARE_STATUS_VALUES = [
  "available",
  "awaiting_transfer",
  "backup_creating",
  "backup_restoring",
  "backup_restoring_error",
  "creating",
  "creating_from_snapshot",
  "deleted",
  "deleting",
  "error",
  "error_deleting",
  "extending",
  "extending_error",
  "inactive",
  "manage_error",
  "manage_starting",
  "migrating",
  "migrating_to",
  "replication_change",
  "reverting",
  "reverting_error",
  "shrinking",
  "shrinking_error",
  "shrinking_possible_data_loss_error",
  "unmanage_error",
  "unmanage_starting",
  "unmanaged",
] as const

export const SHARE_STATUS_FILTER_VALUES = [...SHARE_STATUS_VALUES, SHARE_FILTER_OTHER] as const

// Documented share_proto values, lowercased
export const SHARE_PROTOCOL_VALUES = ["nfs", "cifs", "glusterfs", "hdfs", "cephfs", "maprfs"] as const

export const SHARE_PROTOCOL_FILTER_VALUES = [...SHARE_PROTOCOL_VALUES, SHARE_FILTER_OTHER] as const

export const SHARE_PROTOCOL_LABELS: Record<(typeof SHARE_PROTOCOL_VALUES)[number], string> = {
  nfs: "NFS",
  cifs: "CIFS",
  glusterfs: "GlusterFS",
  hdfs: "HDFS",
  cephfs: "CephFS",
  maprfs: "MAPRFS",
}

export const SHARE_VISIBILITY_FILTER_VALUES = ["public", "private"] as const

export const SHARE_SORT_KEYS = ["name", "status", "size", "created_at"] as const

export type ShareStatusFilter = (typeof SHARE_STATUS_FILTER_VALUES)[number]
export type ShareProtocolFilter = (typeof SHARE_PROTOCOL_FILTER_VALUES)[number]
export type ShareVisibilityFilter = (typeof SHARE_VISIBILITY_FILTER_VALUES)[number]
export type ShareSortKey = (typeof SHARE_SORT_KEYS)[number]
