import { useState } from "react"
import { Modal, ModalFooter, Button, Message } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { uuidFromRef, copyToClipboard } from "../../-components/utils"
import type { Container } from "@/server/KeyManager/types/keyManager"

export function ContainerDetailModal({ container, onClose }: { container: Container; onClose: () => void }) {
  const containerId = uuidFromRef(container.container_ref)
  return (
    <Modal open size="large" title={container.name ?? "Container Details"} onCancel={onClose}>
      <dl className="juno-dl">
        <dt>ID</dt>
        <dd>
          {containerId}
          <Button size="small" variant="subdued" onClick={() => copyToClipboard(containerId)} label="Copy" />
        </dd>
        <dt>Reference</dt>
        <dd>
          {container.container_ref}
          <Button
            size="small"
            variant="subdued"
            onClick={() => copyToClipboard(container.container_ref)}
            label="Copy"
          />
        </dd>
        <dt>Type</dt>
        <dd>{container.type}</dd>
        <dt>Status</dt>
        <dd>{container.status}</dd>
        <dt>Secrets</dt>
        <dd>
          {container.secret_refs.length === 0 ? (
            "None"
          ) : (
            <ul>
              {container.secret_refs.map((ref) => (
                <li key={ref.secret_ref}>
                  <strong>{ref.name}</strong>: {ref.secret_ref}
                  <Button size="small" variant="subdued" onClick={() => copyToClipboard(ref.secret_ref)} label="Copy" />
                </li>
              ))}
            </ul>
          )}
        </dd>
        <dt>Created</dt>
        <dd>{new Date(container.created).toLocaleString()}</dd>
        <dt>Updated</dt>
        <dd>{new Date(container.updated).toLocaleString()}</dd>
      </dl>
      <ModalFooter>
        <Button onClick={onClose} label="Close" />
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
      title="Create Container"
      onCancel={onClose}
      onConfirm={() => createMutation.mutate({ project_id: projectId, name: name || undefined, type, secret_refs: [] })}
      confirmButtonLabel={createMutation.isPending ? "Creating..." : "Create"}
      cancelButtonLabel="Cancel"
      disableConfirmButton={createMutation.isPending}
    >
      {createMutation.error && (
        <Message variant="error" className="mb-4">
          {createMutation.error.message}
        </Message>
      )}
      <div className="flex flex-col gap-2">
        <label>
          Name (optional)
          <input
            className="juno-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My container"
          />
        </label>
        <label>
          Type
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
      title="Delete Container"
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, containerId })}
      confirmButtonLabel={deleteMutation.isPending ? "Deleting..." : "Delete"}
      confirmButtonVariant="primary-danger"
      cancelButtonLabel="Cancel"
      disableConfirmButton={deleteMutation.isPending}
    >
      {deleteMutation.error && (
        <Message variant="error" className="mb-4">
          {deleteMutation.error.message}
        </Message>
      )}
      <p>
        Are you sure you want to delete <strong>{container.name ?? containerId}</strong>? This cannot be undone.
      </p>
    </Modal>
  )
}
