import { useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { toast } from "@cloudoperators/juno-ui-components"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { trpcReact } from "@/client/trpcClient"
import { ContainerSummary } from "@/server/Storage/types/swift"
import { ContainerHeaderActions, type ContainerModalType } from "./ContainerHeaderActions"
import { ManageContainerAccessModal } from "./ManageContainerAccessModal"
import { EditContainerMetadataModal } from "./EditContainerMetadataModal"
import { EmptyContainerModal } from "./EmptyContainerModal"
import { DeleteContainerModal } from "./DeleteContainerModal"
import {
  getContainerAclUpdatedToast,
  getContainerAclUpdateErrorToast,
  getContainerUpdatedToast,
  getContainerEmptiedToast,
  getContainerEmptyErrorToast,
  getContainerDeletedToast,
  getContainerDeleteErrorToast,
} from "./ContainerToastNotifications"

interface ContainerHeaderProps {
  containerName: string
}

/**
 * Container header component for the Swift in-container (objects) page.
 *
 * Mirrors Ceph's BucketHeader position/shape: a ContentHeader with the
 * container name and an overflow actions menu. Unlike BucketHeader, there
 * are no badges (Swift has no versioning/policy analog here) and no tabs.
 */
export const ContainerHeader = ({ containerName }: ContainerHeaderProps) => {
  const { projectId, provider, storageType } = useParams({
    from: "/_auth/projects/$projectId/storage/$provider/$storageType/$containerName/objects/",
  })
  const navigate = useNavigate()

  const [activeModal, setActiveModal] = useState<ContainerModalType | null>(null)
  const closeModal = () => setActiveModal(null)

  // The four modals genuinely consume container.count / container.bytes
  // (DeleteContainerModal's non-empty guard, EmptyContainerModal's object-count
  // hint, EditContainerMetadataModal's read-only size/count display) - unlike
  // Ceph's modals, a placeholder { count: 0, bytes: 0 } is not safe here. So we
  // fetch a real summary via getContainerMetadata (one HEAD request) instead of
  // listing every container in the account. Keep the input exactly
  // { project_id, container } so this query shares its cache entry with the
  // identical queries the modals below issue.
  const { data: containerInfo } = trpcReact.storage.swift.getContainerMetadata.useQuery(
    { project_id: projectId, container: containerName },
    { enabled: !!projectId && !!containerName, retry: false }
  )

  const container: ContainerSummary | null = containerInfo
    ? { name: containerName, count: containerInfo.objectCount, bytes: containerInfo.bytesUsed }
    : null

  const handleAclSuccess = (containerName: string) => {
    const { message, ...options } = getContainerAclUpdatedToast(containerName)
    toast.success(message, options)
  }

  const handleAclError = (containerName: string, errorMessage: string) => {
    const { message, ...options } = getContainerAclUpdateErrorToast(containerName, errorMessage)
    toast.error(message, options)
  }

  const handlePropertiesSuccess = (containerName: string) => {
    const { message, ...options } = getContainerUpdatedToast(containerName)
    toast.success(message, options)
  }
  // No onError handler wired for EditContainerMetadataModal: the modal declares
  // the prop for API compatibility but never calls it - update errors are shown
  // inline in the modal (see #1162 / #1191), not via toast.

  const handleEmptySuccess = (containerName: string, deletedCount: number) => {
    const { message, ...options } = getContainerEmptiedToast(containerName, deletedCount)
    toast.success(message, options)
  }

  const handleEmptyError = (containerName: string, errorMessage: string) => {
    const { message, ...options } = getContainerEmptyErrorToast(containerName, errorMessage)
    toast.error(message, options)
  }

  const handleDeleteSuccess = (containerName: string) => {
    const { message, ...options } = getContainerDeletedToast(containerName)
    toast.success(message, options)
    // The container we were browsing no longer exists - navigate back to the
    // container list instead of leaving the user on a now-dead objects page.
    navigate({
      to: "/projects/$projectId/storage/$provider/$storageType",
      params: { projectId, provider, storageType },
    })
  }

  const handleDeleteError = (containerName: string, errorMessage: string) => {
    const { message, ...options } = getContainerDeleteErrorToast(containerName, errorMessage)
    toast.error(message, options)
  }

  return (
    <>
      <ContentHeader
        title={containerName}
        projectId={projectId}
        actions={container ? <ContainerHeaderActions onOpenModal={setActiveModal} /> : null}
      />

      <ManageContainerAccessModal
        isOpen={activeModal === "manageAccess"}
        container={container}
        onClose={closeModal}
        onSuccess={handleAclSuccess}
        onError={handleAclError}
      />

      <EditContainerMetadataModal
        isOpen={activeModal === "editMetadata"}
        container={container}
        onClose={closeModal}
        onSuccess={handlePropertiesSuccess}
      />

      <EmptyContainerModal
        isOpen={activeModal === "emptyContainer"}
        container={container}
        onClose={closeModal}
        onSuccess={handleEmptySuccess}
        onError={handleEmptyError}
      />

      <DeleteContainerModal
        isOpen={activeModal === "deleteContainer"}
        container={container}
        onClose={closeModal}
        onSuccess={handleDeleteSuccess}
        onError={handleDeleteError}
      />
    </>
  )
}
