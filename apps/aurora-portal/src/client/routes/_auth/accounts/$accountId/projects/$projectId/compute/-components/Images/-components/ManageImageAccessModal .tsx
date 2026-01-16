import React, { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import {
  Modal,
  Message,
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Stack,
  Spinner,
  Button,
} from "@cloudoperators/juno-ui-components"
import { GlanceImage, ImageMember } from "@/server/Compute/types/image"
import { trpcReact } from "@/client/trpcClient"
import { TRPCClientError } from "@trpc/client"
import { InferrableClientTypes } from "@trpc/server/unstable-core-do-not-import"
import { ImageMemberFormRow } from "./ImageMemberFormRow"
import { ImageMemberRow } from "./ImageMemberRow"

interface ManageImageAccessProps {
  isOpen: boolean
  onClose: () => void
  image: GlanceImage | null
  permissions: {
    canCreateMember: boolean
    canDeleteMember: boolean
  }
}

function MembersLoadingState() {
  return (
    <DataGridRow>
      <DataGridCell colSpan={4}>
        <Stack distribution="center" alignment="center">
          <Spinner variant="primary" />
        </Stack>
      </DataGridCell>
    </DataGridRow>
  )
}

function MembersContent({
  image,
  imageMembers,
  isMembersLoading,
  canAdd,
  canRemove,
  isAddingMember,
  setIsAddingMember,
  setMessage,
}: {
  image: GlanceImage
  imageMembers: ImageMember[] | undefined
  isMembersLoading: boolean
  canAdd: boolean
  canRemove: boolean
  isAddingMember: boolean
  setIsAddingMember: (adding: boolean) => void
  setMessage: (msg: { text: string; type: "error" | "info" } | null) => void
}) {
  const { t } = useLingui()
  const utils = trpcReact.useUtils()

  const [memberId, setMemberId] = useState("")
  const [errors, setErrors] = useState<{ memberId?: string }>({})
  const [deletingMembers, setDeletingMembers] = useState<Set<string>>(new Set())

  // Mutations
  const createMemberMutation = trpcReact.compute.createImageMember.useMutation({
    onSuccess: () => {
      utils.compute.listImageMembers.invalidate({ imageId: image.id })
    },
  })

  const deleteMemberMutation = trpcReact.compute.deleteImageMember.useMutation({
    onSuccess: () => {
      utils.compute.listImageMembers.invalidate({ imageId: image.id })
    },
  })

  const isPublicImage = image.visibility === "public"
  const shouldShowEmptyState = !imageMembers || imageMembers.length === 0
  const isLoading = createMemberMutation.isPending || deleteMemberMutation.isPending

  const validateForm = (): boolean => {
    const trimmedMemberId = memberId.trim()
    const newErrors: { memberId?: string } = {}

    if (!trimmedMemberId) {
      newErrors.memberId = t`Member ID (project UUID) is required.`
    } else if (imageMembers?.some((member) => member.member_id === trimmedMemberId)) {
      newErrors.memberId = t`This member already has access to this image.`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setMemberId("")
    setErrors({})
  }

  const handleAddMember = async () => {
    if (!validateForm()) {
      setMessage({ text: t`Please fix the validation errors below.`, type: "error" })
      return
    }

    const trimmedMemberId = memberId.trim()

    try {
      await createMemberMutation.mutateAsync({
        imageId: image.id,
        member: trimmedMemberId,
      })

      setMessage({
        text: t`Member "${trimmedMemberId}" has been added successfully.`,
        type: "info",
      })
      resetForm()
      setIsAddingMember(false)
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message || t`Failed to add member`
      setMessage({
        text: errorMessage,
        type: "error",
      })
    }
  }

  const handleRemoveMember = async (memberIdToRemove: string) => {
    setDeletingMembers((prev) => new Set(prev).add(memberIdToRemove))

    try {
      await deleteMemberMutation.mutateAsync({
        imageId: image.id,
        memberId: memberIdToRemove,
      })

      setMessage({
        text: t`Member "${memberIdToRemove}" has been removed successfully.`,
        type: "info",
      })
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message || t`Failed to remove member`
      setMessage({
        text: errorMessage || t`Failed to remove member "${memberIdToRemove}"`,
        type: "error",
      })
    } finally {
      setDeletingMembers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(memberIdToRemove)
        return newSet
      })
    }
  }

  const handleMemberIdChange = (newMemberId: string) => {
    setMemberId(newMemberId)
    if (errors.memberId) setErrors((prev) => ({ ...prev, memberId: undefined }))
  }

  if (isMembersLoading) {
    return (
      <DataGrid columns={4}>
        <DataGridRow>
          <DataGridHeadCell>{t`Image ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Project ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>
        <MembersLoadingState />
      </DataGrid>
    )
  }

  if (isPublicImage) {
    return (
      <DataGrid columns={4}>
        <DataGridRow>
          <DataGridHeadCell>{t`Image ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Project ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridCell colSpan={4} className="text-center py-4 text-theme-default">
            {t`This is a public image. All users have access to it. Explicit sharing is not needed.`}
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <>
      {canAdd && (
        <Stack direction="horizontal" className="bg-theme-background-lvl-1 justify-end p-2">
          <Button
            label={t`Add Project Access`}
            data-testid="addMemberButton"
            onClick={() => setIsAddingMember(true)}
            variant="primary"
            disabled={isAddingMember}
          />
        </Stack>
      )}

      <DataGrid columns={4}>
        <DataGridRow>
          <DataGridHeadCell>{t`Image ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Member ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        {isAddingMember && (
          <ImageMemberFormRow
            memberId={memberId}
            imageId={image.id}
            errors={errors}
            isLoading={isLoading}
            onMemberIdChange={handleMemberIdChange}
            onSave={handleAddMember}
            onCancel={() => {
              resetForm()
              setIsAddingMember(false)
              setMessage(null)
            }}
          />
        )}

        {imageMembers?.map((member, index) => (
          <ImageMemberRow
            key={`${member.member_id}-${index}`}
            member={member}
            isDeleting={deletingMembers.has(member.member_id)}
            onDelete={() => handleRemoveMember(member.member_id)}
            canDelete={canRemove}
          />
        ))}

        {shouldShowEmptyState && !isAddingMember && (
          <DataGridRow>
            <DataGridCell colSpan={4} className="text-center py-4 text-theme-default">
              {t`No projects have access to this image yet. Click "Add Project Access" to grant access.`}
            </DataGridCell>
          </DataGridRow>
        )}
      </DataGrid>
    </>
  )
}

export const ManageImageAccessModal: React.FC<ManageImageAccessProps> = ({
  isOpen,
  onClose,
  image,
  permissions: { canCreateMember, canDeleteMember },
}) => {
  const { t } = useLingui()

  const [message, setMessage] = useState<{ text: string; type: "error" | "info" } | null>(null)
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Queries with tRPC React hooks
  const { data: imageMembers, isLoading: isMembersLoading } = trpcReact.compute.listImageMembers.useQuery(
    { imageId: image?.id || "" },
    {
      enabled: isOpen && !!image?.id,
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

        <MembersContent
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
