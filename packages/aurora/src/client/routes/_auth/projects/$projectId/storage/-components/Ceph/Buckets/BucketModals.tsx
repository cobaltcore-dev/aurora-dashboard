import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useProjectId } from "@/client/hooks/useProjectId"
import { EnableVersioningModal } from "./EnableVersioningModal"
import { SuspendVersioningModal } from "./SuspendVersioningModal"
import { BucketPolicyModal } from "./BucketPolicyModal"
import { DeleteBucketPolicyModal } from "./DeleteBucketPolicyModal"
import { EmptyBucketModal } from "./EmptyBucketModal"
import { DeleteBucketModal } from "./DeleteBucketModal"
import { DeleteVersionsModal } from "./DeleteVersionsModal"

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
  storageType?: string
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
export const BucketModals = ({ bucketName, provider, storageType, activeModal, onClose }: BucketModalsProps) => {
  const navigate = useNavigate()
  const projectId = useProjectId()

  const handleDeleteBucketSuccess = () => {
    // Navigate back to buckets list after successful deletion
    navigate({
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: {
        projectId: projectId ?? "",
        provider: provider ?? "ceph",
        storageType: storageType ?? "buckets",
      },
    })
  }

  return (
    <>
      <EnableVersioningModal
        isOpen={activeModal === "enableVersioning"}
        bucketName={bucketName}
        onClose={onClose}
        onSuccess={onClose}
        onError={onClose}
      />

      <SuspendVersioningModal
        isOpen={activeModal === "suspendVersioning"}
        bucketName={bucketName}
        onClose={onClose}
        onSuccess={onClose}
        onError={onClose}
      />

      <BucketPolicyModal isOpen={activeModal === "policy"} bucketName={bucketName} onClose={onClose} />

      <DeleteBucketPolicyModal
        isOpen={activeModal === "deletePolicy"}
        bucketName={bucketName}
        onClose={onClose}
        onSuccess={onClose}
        onError={onClose}
      />

      <EmptyBucketModal
        isOpen={activeModal === "emptyBucket"}
        bucket={{
          name: bucketName,
          count: 0,
          bytes: 0,
        }}
        onClose={onClose}
        onSuccess={onClose}
        onError={onClose}
      />

      <DeleteBucketModal
        isOpen={activeModal === "deleteBucket"}
        bucket={{
          name: bucketName,
          count: 0,
          bytes: 0,
        }}
        onClose={onClose}
        onSuccess={handleDeleteBucketSuccess}
        onError={onClose}
      />

      <DeleteVersionsModal
        isOpen={activeModal === "deleteVersions"}
        bucket={{
          name: bucketName,
          count: 0,
          bytes: 0,
        }}
        onClose={onClose}
        onSuccess={onClose}
        onError={onClose}
      />
    </>
  )
}

/**
 * Custom hook to manage bucket modal state (deprecated - use direct state in parent instead)
 *
 * @returns Object with openModal function and BucketModals component
 */
export const useBucketModals = (bucketName: string, provider?: string, storageType?: string) => {
  const [activeModal, setActiveModal] = useState<ModalType | null>(null)

  const openModal = (modal: ModalType) => setActiveModal(modal)

  const closeModal = () => setActiveModal(null)

  const ModalsComponent = () => (
    <BucketModals
      bucketName={bucketName}
      provider={provider}
      storageType={storageType}
      activeModal={activeModal}
      onClose={closeModal}
    />
  )

  return {
    openModal,
    activeModal,
    setActiveModal,
    ModalsComponent,
  }
}
