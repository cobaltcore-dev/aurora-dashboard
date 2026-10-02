import { useState } from "react"
import { Modal, ModalFooter, Button, Message } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { uuidFromRef } from "../../-components/utils"
import ClipboardText from "@/client/components/ClipboardText"
import type { Container } from "@/server/KeyManager/types/keyManager"

export function ContainerDetailModal({ container, onClose }: { container: Container; onClose: () => void }) {
  const { t } = useLingui()
  const containerId = uuidFromRef(container.container_ref)
  return (
    <Modal open size="large" title={container.name ?? t`Container Details`} onCancel={onClose}>
      <dl className="juno-dl">
        <dt>{t`ID`}</dt>
        <dd>
          <ClipboardText text={containerId} />
        </dd>
        <dt>{t`Reference`}</dt>
        <dd>
          <ClipboardText text={container.container_ref} />
        </dd>
        <dt>{t`Type`}</dt>
        <dd>{container.type}</dd>
        <dt>{t`Status`}</dt>
        <dd>{container.status}</dd>
        <dt>{t`Secrets`}</dt>
        <dd>
          {container.secret_refs.length === 0 ? (
            t`None`
          ) : (
            <ul>
              {container.secret_refs.map((ref) => (
                <li key={ref.secret_ref}>
                  <strong>{ref.name}</strong>: <ClipboardText text={ref.secret_ref} />
                </li>
              ))}
            </ul>
          )}
        </dd>
        <dt>{t`Created`}</dt>
        <dd>{new Date(container.created).toLocaleString()}</dd>
        <dt>{t`Updated`}</dt>
        <dd>{new Date(container.updated).toLocaleString()}</dd>
      </dl>
      <ModalFooter>
        <Button onClick={onClose} label={t`Close`} />
      </ModalFooter>
    </Modal>
  )
}

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
  const [type, setType] = useState<"generic" | "rsa" | "certificate">("generic")

  const createMutation = trpcReact.keyManager.createContainer.useMutation({
    onSuccess: () => {
      onSuccess()
      onClose()
    },
  })

  return (
    <Modal
      open
      title={t`Create Container`}
      onCancel={onClose}
      onConfirm={() => createMutation.mutate({ project_id: projectId, name: name || undefined, type, secret_refs: [] })}
      confirmButtonLabel={createMutation.isPending ? t`Creating...` : t`Create`}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={createMutation.isPending}
    >
      {createMutation.error && (
        <Message variant="error" className="mb-4">
          {createMutation.error.message}
        </Message>
      )}
      <div className="flex flex-col gap-2">
        <label>
          {t`Name (optional)`}
          <input
            className="juno-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t`My container`}
          />
        </label>
        <label>
          {t`Type`}
          <select
            className="juno-select"
            value={type}
            onChange={(e) => setType(e.target.value as "generic" | "rsa" | "certificate")}
          >
            <option value="generic">generic</option>
            <option value="rsa">rsa</option>
            <option value="certificate">certificate</option>
          </select>
        </label>
      </div>
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
      title={t`Delete Container`}
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, containerId })}
      confirmButtonLabel={deleteMutation.isPending ? t`Deleting...` : t`Delete`}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={deleteMutation.isPending}
    >
      {deleteMutation.error && (
        <Message variant="error" className="mb-4">
          {deleteMutation.error.message}
        </Message>
      )}
      <p>
        {t`Are you sure you want to delete`} <strong>{container.name ?? containerId}</strong>?{" "}
        {t`This cannot be undone.`}
      </p>
    </Modal>
  )
}
