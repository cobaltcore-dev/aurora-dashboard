/**
 * OpenStack Glance image lifecycle states
 */
export const IMAGE_STATUSES = {
  /** Image metadata created, awaiting upload */
  QUEUED: "queued",
  /** Image data is being uploaded */
  SAVING: "saving",
  /** Image is ready to use */
  ACTIVE: "active",
  /** Image exists but is disabled for use */
  DEACTIVATED: "deactivated",
  /** Image upload failed or was interrupted */
  KILLED: "killed",
  /** Image is marked for deletion */
  DELETED: "deleted",
  /** Image deletion is in progress */
  PENDING_DELETE: "pending_delete",
} as const

/**
 * Image visibility/sharing levels
 */
export const IMAGE_VISIBILITY = {
  /** Visible to all users in the cloud */
  PUBLIC: "public",
  /** Visible only to the owner */
  PRIVATE: "private",
  /** Explicitly shared with specific projects */
  SHARED: "shared",
  /** Shared with all users, no explicit members */
  COMMUNITY: "community",
  /** Special filter value: returns all images accessible to the user (public, private, shared, community) */
  ALL: "all",
} as const

/**
 * Supported virtual disk formats
 */
export const DISK_FORMATS = {
  /** Amazon Machine Image */
  AMI: "ami",
  /** Amazon Ramdisk Image */
  ARI: "ari",
  /** Amazon Kernel Image */
  AKI: "aki",
  /** Virtual Hard Disk (Hyper-V) */
  VHD: "vhd",
  /** Virtual Hard Disk v2 (Hyper-V) */
  VHDX: "vhdx",
  /** Virtual Machine Disk (VMware) */
  VMDK: "vmdk",
  /** Raw unformatted disk image */
  RAW: "raw",
  /** QEMU Copy-On-Write v2 */
  QCOW2: "qcow2",
  /** Virtual Disk Image (VirtualBox) */
  VDI: "vdi",
  /** ISO 9660 optical disc image */
  ISO: "iso",
  /** Parallels Loopback Disk */
  PLOOP: "ploop",
} as const

/**
 * Supported container/packaging formats
 */
export const CONTAINER_FORMATS = {
  /** Amazon Machine Image */
  AMI: "ami",
  /** Amazon Ramdisk Image */
  ARI: "ari",
  /** Amazon Kernel Image */
  AKI: "aki",
  /** No container, just disk image */
  BARE: "bare",
  /** Open Virtualization Format */
  OVF: "ovf",
  /** Open Virtualization Archive (tar of OVF) */
  OVA: "ova",
  /** Docker container image */
  DOCKER: "docker",
} as const

/** Valid image lifecycle status values */
export type ImageStatus = (typeof IMAGE_STATUSES)[keyof typeof IMAGE_STATUSES]

/** Valid image visibility/sharing levels */
export type ImageVisibility = (typeof IMAGE_VISIBILITY)[keyof typeof IMAGE_VISIBILITY]

/** Valid virtual disk format types */
export type DiskFormat = (typeof DISK_FORMATS)[keyof typeof DISK_FORMATS]

/** Valid container/packaging format types */
export type ContainerFormat = (typeof CONTAINER_FORMATS)[keyof typeof CONTAINER_FORMATS]
