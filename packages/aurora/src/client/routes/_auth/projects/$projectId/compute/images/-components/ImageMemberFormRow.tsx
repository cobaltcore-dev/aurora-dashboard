import React from "react"
import { useLingui } from "@lingui/react/macro"
import { DataGridRow, DataGridCell, TextInput, ButtonRow, Button } from "@cloudoperators/juno-ui-components"

interface ImageMemberFormRowProps {
  memberId: string
  imageId: string
  errors: { memberId?: string }
  isLoading: boolean
  onMemberIdChange: (memberId: string) => void
  onSave: () => void
  onCancel: () => void
}

export const ImageMemberFormRow: React.FC<ImageMemberFormRowProps> = ({
  memberId,
  imageId,
  errors,
  isLoading,
  onMemberIdChange,
  onSave,
  onCancel,
}) => {
  const { t } = useLingui()

  return (
    <DataGridRow>
      <DataGridCell></DataGridCell>
      <DataGridCell className="pl-0">
        <TextInput
          label={t`Project ID`}
          value={memberId}
          onChange={(e) => onMemberIdChange(e.target.value)}
          errortext={errors.memberId}
          required
        />
      </DataGridCell>
      <DataGridCell className="break-all">{imageId}</DataGridCell>
      <DataGridCell>
        <ButtonRow>
          <Button icon="check" onClick={onSave} variant="primary" title={t`Add Member`} disabled={isLoading} />
          <Button icon="cancel" onClick={onCancel} title={t`Cancel`} disabled={isLoading} />
        </ButtonRow>
      </DataGridCell>
    </DataGridRow>
  )
}
