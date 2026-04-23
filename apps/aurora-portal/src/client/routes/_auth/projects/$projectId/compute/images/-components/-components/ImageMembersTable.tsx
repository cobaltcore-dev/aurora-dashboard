import React, { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import {
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Stack,
  Spinner,
  Button,
  Message,
} from "@cloudoperators/juno-ui-components"
import { GlanceImage, ImageMember } from "@/server/Compute/types/image"
import { trpcReact } from "@/client/trpcClient"
import { TRPCClientError } from "@trpc/client"
import { InferrableClientTypes } from "@trpc/server/unstable-core-do-not-import"
import { useProjectId } from "@/client/hooks"
import { ImageMemberFormRow } from "./ImageMemberFormRow"
import { ImageMemberRow } from "./ImageMemberRow"

interface ImageMembersTableProps {
  image: GlanceImage
  imageMembers: ImageMember[] | undefined
  isMembersLoading: boolean
  canAdd: boolean
  canRemove: boolean
  isAddingMember: boolean
  setIsAddingMember: (adding: boolean) => void
  setMessage: (msg: { text: string; type: "error" | "info" } | null) => void
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

export const ImageMembersTable: React.FC<ImageMembersTableProps> = ({
  image,
  imageMembers,
  isMembersLoading,
  canAdd,
  canRemove,
  isAddingMember,
  setIsAddingMember,
  setMessage,
}) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const [memberId, setMemberId] = useState("")
  const [errors, setErrors] = useState<{ memberId?: string }>({})
  const [deletingMembers, setDeletingMembers] = useState<Set<string>>(new Set())

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
        project_id: projectId,
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
        project_id: projectId,
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
      <Message
        text={t`This is a public image. All users have access to it. Explicit sharing is not needed.`}
        variant="info"
      />
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
            <DataGridCell colSpan={4} className="text-theme-default py-4 text-center">
              {t`No projects have access to this image yet. Click "Add Project Access" to grant access.`}
            </DataGridCell>
          </DataGridRow>
        )}
      </DataGrid>
    </>
  )
}
