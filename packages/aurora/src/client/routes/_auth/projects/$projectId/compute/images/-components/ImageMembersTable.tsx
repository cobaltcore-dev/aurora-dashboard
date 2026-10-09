import React, { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import {
  DataGrid,
  DataGridRow,
  DataGridHeadCell,
  DataGridCell,
  Stack,
  Status,
  Button,
  Message,
} from "@cloudoperators/juno-ui-components"
import { GlanceImage, ImageMember } from "@/server/Compute/types/image"
import { trpcReact } from "@/client/trpcClient"
import { TRPCClientError } from "@trpc/client"
import { InferrableClientTypes } from "@trpc/server/unstable-core-do-not-import"
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
  projectId: string
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
  projectId,
}) => {
  const { t } = useLingui()
  const utils = trpcReact.useUtils()

  const [memberId, setMemberId] = useState("")
  const [errors, setErrors] = useState<{ memberId?: string }>({})
  const [deletingMembers, setDeletingMembers] = useState<Set<string>>(new Set())

  const createMemberMutation = trpcReact.compute.createImageMember.useMutation({
    onSuccess: () => {
      utils.compute.listImageMembers.invalidate({ project_id: projectId, imageId: image.id })
    },
  })

  const deleteMemberMutation = trpcReact.compute.deleteImageMember.useMutation({
    onSuccess: () => {
      utils.compute.listImageMembers.invalidate({ project_id: projectId, imageId: image.id })
    },
  })

  const isPublicImage = image.visibility === "public"
  const shouldShowEmptyState = !imageMembers || imageMembers.length === 0
  const isLoading = createMemberMutation.isPending || deleteMemberMutation.isPending

  // Sort members: pending first, then accepted, then rejected, alphabetically by member_id within each group
  const sortedMembers = imageMembers
    ? [...imageMembers].sort((a, b) => {
        const statusOrder = { pending: 0, accepted: 1, rejected: 2 }
        const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 3
        const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 3

        if (aOrder !== bOrder) return aOrder - bOrder
        return a.member_id.localeCompare(b.member_id)
      })
    : []

  const validateForm = async (): Promise<boolean> => {
    const trimmedMemberId = memberId.trim()
    const newErrors: { memberId?: string } = {}

    if (!trimmedMemberId) {
      newErrors.memberId = t`Project ID (project UUID) is required.`
    } else if (imageMembers?.some((member) => member.member_id === trimmedMemberId)) {
      newErrors.memberId = t`This member already has access to this image.`
    } else {
      // Validate that the project exists
      try {
        await utils.project.getProject.fetch({ projectId: trimmedMemberId })
      } catch {
        newErrors.memberId = t`Project not found or you don't have access to it.`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setMemberId("")
    setErrors({})
  }

  const handleAddMember = async () => {
    if (!(await validateForm())) {
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
          <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Project ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Image ID`}</DataGridHeadCell>
          <DataGridHeadCell></DataGridHeadCell>
        </DataGridRow>

        <DataGridRow>
          <DataGridCell colSpan={4}>
            <Status status="progress" title={t`Loading...`} />
          </DataGridCell>
        </DataGridRow>
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
            disabled={isAddingMember}
          />
        </Stack>
      )}

      <DataGrid columns={4}>
        <DataGridRow>
          <DataGridHeadCell>{t`Status`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Project ID`}</DataGridHeadCell>
          <DataGridHeadCell>{t`Image ID`}</DataGridHeadCell>
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

        {sortedMembers.map((member, index) => (
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
