import React from "react"
import { useLingui } from "@lingui/react/macro"

import { Modal, Form, FormRow, FormSection } from "@cloudoperators/juno-ui-components"
import { Flavor } from "@/server/Compute/types/flavor"

interface CreateFlavorModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (newImage: Partial<Flavor>) => void
}

export const CreateFlavorModal: React.FC<CreateFlavorModalProps> = ({ isOpen, onClose, onCreate }) => {
  const { t } = useLingui()

  const handleClose = () => {
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate({ id: "test" })
    handleClose()
  }

  return (
    <Modal
      onCancel={handleClose}
      size="large"
      title={t`Create New Flavor`}
      open={isOpen}
      onConfirm={(e) => {
        onClose()
        handleSubmit(e)
      }}
      cancelButtonLabel={t`Cancel`}
      confirmButtonLabel={t`Create Flavor`}
    >
      <Form>
        <FormSection>
          <FormRow>
            <p>Hi!</p>
          </FormRow>
        </FormSection>
      </Form>
    </Modal>
  )
}
