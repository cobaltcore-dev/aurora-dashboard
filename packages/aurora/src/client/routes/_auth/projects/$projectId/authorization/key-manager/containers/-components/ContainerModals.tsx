import { useState } from "react"
import {
  Modal,
  Form,
  FormSection,
  FormRow,
  TextInput,
  Select,
  SelectOption,
  Message,
  Stack,
} from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { uuidFromRef } from "../../-components/utils"
import type { Container } from "@/server/KeyManager/types/keyManager"

const CONTAINER_TYPES: Container["type"][] = ["generic", "rsa", "certificate"]

export function CreateContainerModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const { t } = useLingui()
  const [name, setName] = useState("")
  const [type, setType] = useState<Container["type"]>("generic")

  const createMutation = trpcReact.keyManager.createContainer.useMutation({
    onSuccess: () => {
      onSuccess()
      onClose()
    },
  })

  return (
    <Modal
      open
      size="large"
      title={t`Create Container`}
      onCancel={onClose}
      onConfirm={() => createMutation.mutate({ project_id: projectId, name: name || undefined, type, secret_refs: [] })}
      confirmButtonLabel={t`Create`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={createMutation.isPending}
      disableCancelButton={createMutation.isPending}
    >
      <Form
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        {createMutation.error && (
          <FormRow>
            <Message variant="error" text={createMutation.error.message} />
          </FormRow>
        )}
        <FormSection>
          <FormRow>
            <TextInput
              id="name"
              label={t`Name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              helptext={t`Optional. A friendly name for the container.`}
            />
          </FormRow>
          <FormRow>
            <Select id="container-type" label={t`Type`} value={type} onChange={(v) => setType(v as Container["type"])}>
              {CONTAINER_TYPES.map((containerType) => (
                <SelectOption key={containerType} value={containerType} label={containerType} />
              ))}
            </Select>
          </FormRow>
        </FormSection>
      </Form>
    </Modal>
  )
}

export function DeleteContainerModal({
  projectId,
  container,
  onClose,
}: {
  projectId: string
  container: Container
  onClose: () => void
}) {
  const { t } = useLingui()
  const containerId = uuidFromRef(container.container_ref)
  const containerName = container.name ?? containerId
  const utils = trpcReact.useUtils()
  const deleteMutation = trpcReact.keyManager.deleteContainer.useMutation({
    onSuccess: () => {
      void utils.keyManager.listContainers.invalidate()
      onClose()
    },
  })

  return (
    <Modal
      open
      size="small"
      title={t`Delete Container "${containerName}"`}
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, containerId })}
      confirmButtonLabel={deleteMutation.isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={deleteMutation.isPending}
      disableCancelButton={deleteMutation.isPending}
    >
      <Stack direction="vertical" gap="4">
        {deleteMutation.error && <Message variant="error" text={deleteMutation.error.message} />}
        <p className="text-theme-default">
          {t`This action cannot be undone. The container will be permanently deleted.`}
        </p>
      </Stack>
    </Modal>
  )
}
