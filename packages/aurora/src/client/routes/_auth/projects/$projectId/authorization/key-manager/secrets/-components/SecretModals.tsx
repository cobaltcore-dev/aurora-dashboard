import { Modal, ModalFooter, Button, Message } from "@cloudoperators/juno-ui-components"
import { useState } from "react"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { uuidFromRef } from "../../-components/utils"
import ClipboardText from "@/client/components/ClipboardText"
import type { Secret } from "@/server/KeyManager/types/keyManager"

export function SecretDetailModal({ secret, onClose }: { secret: Secret; onClose: () => void }) {
  const { t } = useLingui()
  const secretId = uuidFromRef(secret.secret_ref)
  return (
    <Modal open size="large" title={secret.name ?? t`Secret Details`} onCancel={onClose}>
      <dl className="juno-dl">
        <dt>{t`ID`}</dt>
        <dd>
          <ClipboardText text={secretId} />
        </dd>
        <dt>{t`Reference`}</dt>
        <dd>
          <ClipboardText text={secret.secret_ref} />
        </dd>
        <dt>{t`Type`}</dt>
        <dd>{secret.secret_type}</dd>
        <dt>{t`Algorithm`}</dt>
        <dd>{secret.algorithm ?? "—"}</dd>
        <dt>{t`Bit Length`}</dt>
        <dd>{secret.bit_length ?? "—"}</dd>
        <dt>{t`Mode`}</dt>
        <dd>{secret.mode ?? "—"}</dd>
        <dt>{t`Status`}</dt>
        <dd>{secret.status}</dd>
        <dt>{t`Content Types`}</dt>
        <dd>
          {secret.content_types
            ? Object.entries(secret.content_types)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")
            : "—"}
        </dd>
        <dt>{t`Expiration`}</dt>
        <dd>{secret.expiration ?? t`Never`}</dd>
        <dt>{t`Created`}</dt>
        <dd>{new Date(secret.created).toLocaleString()}</dd>
        <dt>{t`Updated`}</dt>
        <dd>{new Date(secret.updated).toLocaleString()}</dd>
      </dl>
      <ModalFooter>
        <Button onClick={onClose} label={t`Close`} />
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
  const { t } = useLingui()
  const [name, setName] = useState("")
  const [secretType, setSecretType] = useState("opaque")
  const [payload, setPayload] = useState("")

  const createMutation = trpcReact.keyManager.createSecret.useMutation({
    onSuccess: () => {
      onSuccess()
      onClose()
    },
  })

  return (
    <Modal
      open
      title={t`Create Secret`}
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
            placeholder={t`My secret`}
          />
        </label>
        <label>
          {t`Type`}
          <select className="juno-select" value={secretType} onChange={(e) => setSecretType(e.target.value)}>
            {["opaque", "symmetric", "public", "private", "passphrase", "certificate"].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t`Payload (optional)`}
          <textarea
            className="juno-textarea"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={4}
            placeholder={t`Secret value...`}
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
  const { t } = useLingui()
  const secretId = uuidFromRef(secret.secret_ref)
  const utils = trpcReact.useUtils()
  const deleteMutation = trpcReact.keyManager.deleteSecret.useMutation({
    onSuccess: () => {
      void utils.keyManager.listSecrets.invalidate()
      onClose()
    },
  })

  return (
    <Modal
      open
      title={t`Delete Secret`}
      onCancel={onClose}
      onConfirm={() => deleteMutation.mutate({ project_id: projectId, secretId })}
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
        {t`Are you sure you want to delete`} <strong>{secret.name ?? secretId}</strong>? {t`This cannot be undone.`}
      </p>
    </Modal>
  )
}
