import React, { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { Modal, Message } from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"
import { trpcReact } from "@/client/trpcClient"
import { ImageMembersTable } from "./ImageMembersTable"
import { useProjectId } from "@/client/hooks"

interface ManageImageAccessProps {
  isOpen: boolean
  onClose: () => void
  image: GlanceImage | null
  permissions: {
    canCreateMember: boolean
    canDeleteMember: boolean
  }
}

export const ManageImageAccessModal: React.FC<ManageImageAccessProps> = ({
  isOpen,
  onClose,
  image,
  permissions: { canCreateMember, canDeleteMember },
}) => {
  const { t } = useLingui()
  const projectId = useProjectId()

  const [message, setMessage] = useState<{ text: string; type: "error" | "info" } | null>(null)
  const [isAddingMember, setIsAddingMember] = useState(false)

  const { data: imageMembers, isLoading: isMembersLoading } = trpcReact.compute.listImageMembers.useQuery(
    { project_id: projectId, imageId: image?.id || "" },
    {
      enabled: isOpen && !!image?.id && !!projectId,
    }
  )

  const handleClose = () => {
    setMessage(null)
    setIsAddingMember(false)
    onClose()
  }

  if (!isOpen || !image) {
    return null
  }

  const imageName = image.name || image.id

  return (
    <Modal onCancel={handleClose} title={t`Manage Access for Image - ${imageName}`} open={isOpen} size="xl">
      <div>
        {message && (
          <Message onDismiss={() => setMessage(null)} text={message.text} variant={message.type} className="mb-4" />
        )}

        <ImageMembersTable
          image={image}
          imageMembers={imageMembers}
          isMembersLoading={isMembersLoading}
          canAdd={canCreateMember}
          canRemove={canDeleteMember}
          isAddingMember={isAddingMember}
          setIsAddingMember={setIsAddingMember}
          setMessage={setMessage}
        />
      </div>
    </Modal>
  )
}
