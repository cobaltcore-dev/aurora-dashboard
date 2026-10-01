import { Modal, ModalFooter, Button, Message } from "@cloudoperators/juno-ui-components"
import { useState } from "react"
import { trpc } from "../../../trpc"
import { uuidFromRef, copyToClipboard } from "../../../utils"
import type { Secret } from "../../../../server/types"

export function SecretDetailModal({ secret, onClose }: { secret: Secret; onClose: () => void }) {
  const secretId = uuidFromRef(secret.secret_ref)
  return (
    <Modal open size="large" title={secret.name ?? "Secret Details"} onCancel={onClose}>
      <dl className="juno-dl">
        <dt>ID</dt>
        <dd>
          {secretId}
          <Button size="small" variant="subdued" onClick={() => copyToClipboard(secretId)} label="Copy" />
        </dd>
        <dt>Reference</dt>
        <dd>
          {secret.secret_ref}
          <Button size="small" variant="subdued" onClick={() => copyToClipboard(secret.secret_ref)} label="Copy" />
        </dd>
        <dt>Type</dt>
        <dd>{secret.secret_type}</dd>
        <dt>Algorithm</dt>
        <dd>{secret.algorithm ?? "—"}</dd>
        <dt>Bit Length</dt>
        <dd>{secret.bit_length ?? "—"}</dd>
        <dt>Mode</dt>
        <dd>{secret.mode ?? "—"}</dd>
        <dt>Status</dt>
        <dd>{secret.status}</dd>
        <dt>Content Types</dt>
        <dd>
          {secret.content_types
            ? Object.entries(secret.content_types)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")
            : "—"}
        </dd>
        <dt>Expiration</dt>
        <dd>{secret.expiration ?? "Never"}</dd>
        <dt>Created</dt>
        <dd>{new Date(secret.created).toLocaleString()}</dd>
        <dt>Updated</dt>
        <dd>{new Date(secret.updated).toLocaleString()}</dd>
      </dl>
      <ModalFooter>
        <Button onClick={onClose} label="Close" />
      </ModalFooter>
    </Modal>
  )
}

export function CreateSecretModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [name, setName] = useState("")
  const [secretType, setSecretType] = useState("opaque")
  const [payload, setPayload] = useState("")

  const createMutation = trpc.keyManager.createSecret.useMutation({
    onSuccess: () => {
      onSuccess()
      onClose()
    },
  })

  return (
    <Modal
      open
      title="Create Secret"
      onCancel={onClose}
      onConfirm={() =>
        createMutation.mutate({
          project_id: projectId,
          name: name || undefined,
          secret_type: secretType,
          payload: payload || undefined,
          payload_content_type: payload ? "text/plain" : undefined,
        })
      }
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
            placeholder="My secret"
          />
        </label>
        <label>
          Type
          <select className="juno-select" value={secretType} onChange={(e) => setSecretType(e.target.value)}>
            {["opaque", "symmetric", "public", "private", "passphrase", "certificate"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Payload (optional)
          <textarea
            className="juno-textarea"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={4}
            placeholder="Secret value..."
          />
        </label>
      </div>
    </Modal>
  )
}

export function DeleteSecretModal({
  projectId,
  secret,
  onClose,
}: {
  projectId: string
  secret: Secret
  onClose: () => void
}) {
  const secretId = uuidFromRef(secret.secret_ref)
  const utils = trpc.useUtils()
  const deleteMutation = trpc.keyManager.deleteSecret.useMutation({
    onSuccess: () => {
      utils.keyManager.listSecrets.invalidate()
      onClose()
    },
  })

  return (
    <Modal
      open
      title="Delete Secret"
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, secretId })}
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
        Are you sure you want to delete <strong>{secret.name ?? secretId}</strong>? This cannot be undone.
      </p>
    </Modal>
  )
}
