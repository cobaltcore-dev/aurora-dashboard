export const IMAGE_STATUSES = {
  QUEUED: "queued",
  SAVING: "saving",
  ACTIVE: "active",
  DEACTIVATED: "deactivated",
  KILLED: "killed",
  DELETED: "deleted",
  PENDING_DELETE: "pending_delete",
} as const

export const IMAGE_VISIBILITY = {
  PUBLIC: "public",
  PRIVATE: "private",
  SHARED: "shared",
  COMMUNITY: "community",
} as const

export const DISK_FORMATS = {
  AMI: "ami",
  ARI: "ari",
  AKI: "aki",
  VHD: "vhd",
  VHDX: "vhdx",
  VMDK: "vmdk",
  RAW: "raw",
  QCOW2: "qcow2",
  VDI: "vdi",
  ISO: "iso",
  PLOOP: "ploop",
} as const

export const CONTAINER_FORMATS = {
  AMI: "ami",
  ARI: "ari",
  AKI: "aki",
  BARE: "bare",
  OVF: "ovf",
  OVA: "ova",
  DOCKER: "docker",
} as const

export type ImageStatus = (typeof IMAGE_STATUSES)[keyof typeof IMAGE_STATUSES]
export type ImageVisibility = (typeof IMAGE_VISIBILITY)[keyof typeof IMAGE_VISIBILITY]
export type DiskFormat = (typeof DISK_FORMATS)[keyof typeof DISK_FORMATS]
export type ContainerFormat = (typeof CONTAINER_FORMATS)[keyof typeof CONTAINER_FORMATS]
