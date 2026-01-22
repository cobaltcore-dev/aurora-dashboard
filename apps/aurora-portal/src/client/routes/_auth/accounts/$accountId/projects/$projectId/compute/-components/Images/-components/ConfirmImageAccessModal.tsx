import React from "react"
import { useLingui } from "@lingui/react/macro"
import {
  Modal,
  Message,
  Stack,
  Spinner,
  Button,
  Badge,
  BadgeVariantType,
  ToastProps,
} from "@cloudoperators/juno-ui-components"
import { GlanceImage, MemberStatus } from "@/server/Compute/types/image"

import { trpcReact } from "@/client/trpcClient"
import { TRPCClientError } from "@trpc/client"
import { InferrableClientTypes } from "@trpc/server/unstable-core-do-not-import"
import { MEMBER_STATUSES } from "../../../-constants/filters"
import { getImageAccessStatusUpdatedToast, getImageAccessStatusErrorToast } from "./ImageToastNotifications"

interface ConfirmImageAccessProps {
  isOpen: boolean
  onClose: () => void
  image: GlanceImage | null
  memberId: string | null
  permissions: {
    canUpdateMember: boolean
  }
  setMessage: (value: ToastProps | null) => void
}

export const ConfirmImageAccessModal: React.FC<ConfirmImageAccessProps> = ({
  isOpen,
  onClose,
  image,
  memberId,
  permissions: { canUpdateMember },
  setMessage,
}) => {
  const { t } = useLingui()
  const utils = trpcReact.useUtils()

  // Queries with tRPC React hooks
  const { data: memberData, isLoading: isMemberLoading } = trpcReact.compute.getImageMember.useQuery(
    { imageId: image?.id || "", memberId: memberId || "" },
    { enabled: isOpen && !!image?.id && !!memberId }
  )

  // Mutation with cache invalidation
  const updateMemberMutation = trpcReact.compute.updateImageMember.useMutation({
    onSuccess: () => {
      utils.compute.getImageMember.invalidate({ imageId: image?.id || "", memberId: memberId || "" })
      utils.compute.listImageMembers.invalidate({ imageId: image?.id || "" })
      utils.compute.listImagesWithPagination.invalidate()
      utils.compute.listSharedImagesByMemberStatus.invalidate()
    },
  })

  const handleClose = () => {
    onClose()
  }

  const handleMemberStatusChange = async (newStatus: MemberStatus) => {
    if (!image?.id || !memberId) return

    try {
      await updateMemberMutation.mutateAsync({
        imageId: image.id,
        memberId,
        status: newStatus,
      })

      setMessage(
        getImageAccessStatusUpdatedToast(newStatus, {
          onDismiss: () => setMessage(null),
        })
      )
    } catch (error) {
      const errorMessage = (error as TRPCClientError<InferrableClientTypes>)?.message

      setMessage(
        getImageAccessStatusErrorToast(errorMessage, {
          onDismiss: () => setMessage(null),
        })
      )
    } finally {
      handleClose()
    }
  }

  if (!isOpen || !image || !memberId) {
    return null
  }

  // Determine title based on member status
  const isPending = memberData?.status === MEMBER_STATUSES.PENDING

  const imageTitle = image.name || image.id

  const modalTitle = isPending ? t`Confirm Access - ${imageTitle}` : t`Review Access - ${imageTitle}`

  const isLoading = isMemberLoading || updateMemberMutation.isPending

  // Loading state
  if (isMemberLoading) {
    return (
      <Modal onCancel={handleClose} title={modalTitle} open={isOpen} size="large">
        <div className="flex justify-center items-center py-8">
          <Spinner variant="primary" />
        </div>
      </Modal>
    )
  }

  // Error state - member not found
  if (!memberData) {
    return (
      <Modal onCancel={handleClose} title={modalTitle} open={isOpen} size="large">
        <Message text={t`Member information could not be loaded.`} variant="error" onDismiss={handleClose} />
      </Modal>
    )
  }

  // Helper function to get status badge styling
  const getStatusBadgeVariant = (status: string): BadgeVariantType => {
    switch (status) {
      case MEMBER_STATUSES.PENDING:
        return "warning"
      case MEMBER_STATUSES.ACCEPTED:
        return "success"
      case MEMBER_STATUSES.REJECTED:
        return "danger"
      default:
        return "default"
    }
  }

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleString()
    } catch {
      return timestamp
    }
  }

  return (
    <Modal onCancel={handleClose} title={modalTitle} open={isOpen} size="large">
      <div>
        {/* Member and Image Details */}
        <div className="mb-6 bg-theme-background-lvl-1 rounded p-4 space-y-4">
          {/* Image Info */}
          <div>
            <h4 className="text-xs font-semibold text-theme-secondary uppercase tracking-wide mb-1">{t`Image`}</h4>
            <p className="text-sm break-all font-medium">{image.name || image.id}</p>
            <p className="text-xs font-mono text-theme-secondary break-all mt-1">{image.id}</p>
          </div>

          {/* Project/Member Info */}
          <div>
            <h4 className="text-xs font-semibold text-theme-secondary uppercase tracking-wide mb-1">{t`Project ID`}</h4>
            <p className="text-xs font-mono break-all text-theme-default">{memberData.member_id}</p>
          </div>

          {/* Status */}
          <div>
            <h4 className="text-xs font-semibold text-theme-secondary uppercase tracking-wide mb-1">
              {t`Current Status`}
            </h4>
            <Badge text={memberData.status} variant={getStatusBadgeVariant(memberData.status)} />
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-theme-background-lvl-2">
            {memberData.created_at && (
              <div>
                <h4 className="text-xs font-semibold text-theme-secondary uppercase tracking-wide mb-1">
                  {t`Created`}
                </h4>
                <p className="text-xs text-theme-secondary">{formatTimestamp(memberData.created_at)}</p>
              </div>
            )}

            {memberData.updated_at && (
              <div>
                <h4 className="text-xs font-semibold text-theme-secondary uppercase tracking-wide mb-1">
                  {t`Updated`}
                </h4>
                <p className="text-xs text-theme-secondary">{formatTimestamp(memberData.updated_at)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Description/Instructions */}
        {isPending && (
          <Message
            text={t`This image has been shared with your project. Please confirm whether you want to accept or reject access. Once you accept, the image will be visible in your project's image list.`}
            variant="info"
            className="mb-6"
          />
        )}
        {!isPending && memberData.status === MEMBER_STATUSES.ACCEPTED && (
          <Message
            text={t`Your project has accepted access to this image. You can revoke access at any time.`}
            variant="info"
            className="mb-6"
          />
        )}
        {!isPending && memberData.status === MEMBER_STATUSES.REJECTED && (
          <Message
            text={t`Your project has rejected access to this image. You can change your decision and accept it, or request access again from the owner.`}
            variant="info"
            className="mb-6"
          />
        )}

        {/* Action Buttons */}
        {canUpdateMember && (
          <Stack direction="horizontal" className="justify-end gap-2">
            {isPending && (
              <>
                <Button
                  label={t`Reject`}
                  variant="subdued"
                  onClick={() => handleMemberStatusChange(MEMBER_STATUSES.REJECTED)}
                  disabled={isLoading}
                  data-testid="reject-button"
                />
                <Button
                  label={t`Accept`}
                  variant="primary"
                  onClick={() => handleMemberStatusChange(MEMBER_STATUSES.ACCEPTED)}
                  disabled={isLoading}
                  data-testid="accept-button"
                />
              </>
            )}
            {!isPending && (
              <>
                {memberData.status === MEMBER_STATUSES.REJECTED && (
                  <Button
                    label={t`Accept`}
                    variant="primary"
                    onClick={() => handleMemberStatusChange(MEMBER_STATUSES.ACCEPTED)}
                    disabled={isLoading}
                    data-testid="accept-rejected-button"
                  />
                )}
                {memberData.status !== MEMBER_STATUSES.REJECTED && (
                  <Button
                    label={t`Revoke Access`}
                    variant="primary-danger"
                    onClick={() => {
                      handleMemberStatusChange(MEMBER_STATUSES.REJECTED)
                    }}
                    disabled={isLoading}
                    data-testid="revoke-button"
                  />
                )}
              </>
            )}
          </Stack>
        )}

        {!canUpdateMember && (
          <div className="p-4 bg-theme-background-lvl-2 rounded">
            <p className="text-sm text-theme-secondary">{t`You don't have permission to modify access for this image.`}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
