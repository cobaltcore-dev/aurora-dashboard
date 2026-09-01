import React, { Fragment, useState, useEffect } from "react"
import { useLingui } from "@lingui/react/macro"
import { DescriptionTerm, DescriptionDefinition, Button, Spinner } from "@cloudoperators/juno-ui-components"

interface SpecRowProps {
  specKey: string
  value: string
  isDeleting: boolean
  onDelete: () => void
  canDelete?: boolean
}

export const SpecRow: React.FC<SpecRowProps> = ({ specKey, value, isDeleting, onDelete, canDelete }) => {
  const { t } = useLingui()
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (confirm) {
      const timer = setTimeout(() => {
        setConfirm(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [confirm])

  const handleConfirmDelete = () => {
    setConfirm(false)
    onDelete()
  }

  const deleteButton = () => {
    if (!canDelete) return null
    if (isDeleting) {
      return <Spinner variant="primary" size="small" />
    }
    if (confirm) {
      return (
        <Button
          variant="primary-danger"
          onClick={handleConfirmDelete}
          title={t`Delete`}
          aria-label={t`Delete`}
          data-testid="confirm-deletion"
          size="small"
        >
          {t`Delete`}
        </Button>
      )
    }
    return (
      <Button
        icon="deleteForever"
        onClick={() => setConfirm(true)}
        title={t`Delete ${specKey}`}
        aria-label={t`Delete ${specKey}`}
        data-testid={`delete-${specKey}`}
        size="small"
      />
    )
  }

  return (
    <Fragment>
      <DescriptionTerm>{specKey}</DescriptionTerm>
      <DescriptionDefinition className="flex justify-between">
        <span className="break-all">{value}</span>
        {deleteButton()}
      </DescriptionDefinition>
    </Fragment>
  )
}
