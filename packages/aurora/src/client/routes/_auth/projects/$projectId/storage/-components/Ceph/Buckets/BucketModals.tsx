import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { STORAGE_PROVIDER, asStorageProvider, storageTypeFor } from "@/client/utils/storageProviders"
import { EnableVersioningModal } from "./EnableVersioningModal"
import { SuspendVersioningModal } from "./SuspendVersioningModal"
import { BucketPolicyModal } from "./BucketPolicyModal"
import { DeleteBucketPolicyModal } from "./DeleteBucketPolicyModal"
import { EmptyBucketModal } from "./EmptyBucketModal"
import { DeleteBucketModal } from "./DeleteBucketModal"
import { DeleteVersionsModal } from "./DeleteVersionsModal"
import {
  getVersioningEnabledToast,
  getVersioningEnableErrorToast,
  getVersioningSuspendedToast,
  getVersioningSuspendErrorToast,
  getBucketPolicySavedToast,
  getBucketPolicySaveErrorToast,
  getBucketPolicyDeletedToast,
  getBucketPolicyDeleteErrorToast,
  getVersionsDeletedToast,
  getVersionsDeleteErrorToast,
  getBucketEmptiedToast,
  getBucketEmptyErrorToast,
  getBucketDeletedToast,
  getBucketDeleteErrorToast,
} from "./BucketToastNotifications"

export type ModalType =
  | "enableVersioning"
  | "suspendVersioning"
  | "policy"
  | "deletePolicy"
  | "emptyBucket"
  | "deleteBucket"
  | "deleteVersions"

interface BucketModalsProps {
  bucketName: string
  provider?: string
  activeModal: ModalType | null
  onClose: () => void
}

/**
 * Manages all bucket-related modals with unified state
 *
 * Consolidates 7 different modal states into a single component:
 * - Enable/Suspend Versioning
 * - Bucket Policy (View/Add/Delete)
 * - Empty Bucket / Delete Versions
 * - Delete Bucket
 */
export const BucketModals = ({ bucketName, provider, activeModal, onClose }: BucketModalsProps) => {
  const navigate = useNavigate()
  const projectId = useProjectId()

  // storageType is always derived from the resolved provider, never defaulted independently.
  const resolvedProvider = asStorageProvider(provider, STORAGE_PROVIDER.CEPH)
  const resolvedStorageType = storageTypeFor(resolvedProvider)

  const handleDeleteBucketSuccess = (bucketName: string) => {
    const { message, ...options } = getBucketDeletedToast(bucketName)
    toast.success(message, options)
    // Navigate back to buckets list after successful deletion
    navigate({
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: {
        projectId: projectId ?? "",
        provider: resolvedProvider,
        storageType: resolvedStorageType,
      },
    })
  }

  const handleDeleteBucketError = (bucketName: string, errorMessage: string) => {
    const { message, ...options } = getBucketDeleteErrorToast(bucketName, errorMessage)
    toast.error(message, options)
    onClose()
  }

  return (
    <>
      <EnableVersioningModal
        isOpen={activeModal === "enableVersioning"}
        bucketName={bucketName}
        onClose={onClose}
        onSuccess={(bucketName) => {
          const { message, ...options } = getVersioningEnabledToast(bucketName)
          toast.success(message, options)
          onClose()
        }}
        onError={(bucketName, errorMessage) => {
          const { message, ...options } = getVersioningEnableErrorToast(bucketName, errorMessage)
          toast.error(message, options)
          onClose()
        }}
      />

      <SuspendVersioningModal
        isOpen={activeModal === "suspendVersioning"}
        bucketName={bucketName}
        onClose={onClose}
        onSuccess={(bucketName) => {
          const { message, ...options } = getVersioningSuspendedToast(bucketName)
          toast.success(message, options)
          onClose()
        }}
        onError={(bucketName, errorMessage) => {
          const { message, ...options } = getVersioningSuspendErrorToast(bucketName, errorMessage)
          toast.error(message, options)
          onClose()
        }}
      />

      <BucketPolicyModal
        isOpen={activeModal === "policy"}
        bucketName={bucketName}
        onClose={onClose}
        onSuccess={(bucketName, action) => {
          const { message, ...options } =
            action === "deleted" ? getBucketPolicyDeletedToast(bucketName) : getBucketPolicySavedToast(bucketName)
          toast.success(message, options)
        }}
        onError={(bucketName, errorMessage, action) => {
          const { message, ...options } =
            action === "deleted"
              ? getBucketPolicyDeleteErrorToast(bucketName, errorMessage)
              : getBucketPolicySaveErrorToast(bucketName, errorMessage)
          toast.error(message, options)
        }}
      />

      <DeleteBucketPolicyModal
        isOpen={activeModal === "deletePolicy"}
        bucketName={bucketName}
        onClose={onClose}
        onSuccess={(bucketName) => {
          const { message, ...options } = getBucketPolicyDeletedToast(bucketName)
          toast.success(message, options)
          onClose()
        }}
        onError={(bucketName, errorMessage) => {
          const { message, ...options } = getBucketPolicyDeleteErrorToast(bucketName, errorMessage)
          toast.error(message, options)
          onClose()
        }}
      />

      {/*
        EmptyBucketModal receives a placeholder bucket object with count: 0, bytes: 0.
        This is intentional - the modal fetches real-time bucket state (versioning status,
        object count, versions) via its own queries when opened. The placeholder only provides
        the bucket name for API calls and UI display. This ensures the modal always shows
        fresh data and avoids stale metadata from the parent component.
      */}
      <EmptyBucketModal
        isOpen={activeModal === "emptyBucket"}
        bucket={{
          name: bucketName,
          count: 0,
          bytes: 0,
        }}
        onClose={onClose}
        onSuccess={(bucketName, deletedCount) => {
          const { message, ...options } = getBucketEmptiedToast(bucketName, deletedCount)
          toast.success(message, options)
          onClose()
        }}
        onError={(bucketName, errorMessage) => {
          const { message, ...options } = getBucketEmptyErrorToast(bucketName, errorMessage)
          toast.error(message, options)
          onClose()
        }}
      />

      {/*
        DeleteBucketModal receives a placeholder bucket object with count: 0, bytes: 0.
        This is intentional - the modal fetches real-time bucket state (object list, versions)
        via its own queries when opened. The placeholder only provides the bucket name for
        API calls and UI display. This ensures the modal always shows fresh data and avoids
        stale metadata from the parent component.
      */}
      <DeleteBucketModal
        isOpen={activeModal === "deleteBucket"}
        bucket={{
          name: bucketName,
          count: 0,
          bytes: 0,
        }}
        onClose={onClose}
        onSuccess={handleDeleteBucketSuccess}
        onError={handleDeleteBucketError}
      />

      {/*
        DeleteVersionsModal receives a placeholder bucket object with count: 0, bytes: 0.
        Unlike EmptyBucketModal/DeleteBucketModal above, it doesn't query anything itself -
        it unconditionally scans and cleans up the whole bucket's version history on submit.
        The placeholder only provides the bucket name for the mutation and the confirmation UI.
      */}
      <DeleteVersionsModal
        isOpen={activeModal === "deleteVersions"}
        bucket={{
          name: bucketName,
          count: 0,
          bytes: 0,
        }}
        onClose={onClose}
        onSuccess={(bucketName, deletedCount) => {
          const { message, ...options } = getVersionsDeletedToast(bucketName, deletedCount)
          toast.success(message, options)
          onClose()
        }}
        onError={(bucketName, errorMessage) => {
          const { message, ...options } = getVersionsDeleteErrorToast(bucketName, errorMessage)
          toast.error(message, options)
          onClose()
        }}
      />
    </>
  )
}

/**
 * Custom hook to manage bucket modal state (deprecated - use direct state in parent instead)
 *
 * @returns Object with openModal function and BucketModals component
 */
export const useBucketModals = (bucketName: string, provider?: string) => {
  const [activeModal, setActiveModal] = useState<ModalType | null>(null)

  const openModal = (modal: ModalType) => setActiveModal(modal)

  const closeModal = () => setActiveModal(null)

  const ModalsComponent = () => (
    <BucketModals bucketName={bucketName} provider={provider} activeModal={activeModal} onClose={closeModal} />
  )

  return {
    openModal,
    activeModal,
    setActiveModal,
    ModalsComponent,
  }
}
