import { useState } from "react"
import { Button, Status, Message } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import ClipboardText from "@/client/components/ClipboardText"

interface SecretDetailsViewProps {
  projectId: string
  secretId: string
  onBack: () => void
}

export function SecretDetailsView({ projectId, secretId, onBack }: SecretDetailsViewProps) {
  const { t } = useLingui()
  const [showPayload, setShowPayload] = useState(false)

  const {
    data: secret,
    isLoading,
    isError,
    error,
  } = trpcReact.keyManager.getSecret.useQuery({
    project_id: projectId,
    secretId,
  })

  const {
    data: payloadData,
    isFetching: payloadFetching,
    isError: payloadError,
    refetch: fetchPayload,
  } = trpcReact.keyManager.getSecretPayload.useQuery({ project_id: projectId, secretId }, { enabled: false })

  if (isLoading) return <Status status="progress" title={t`Loading Secret...`} />
  if (isError) return <Status status="error" title={error?.message ?? t`Failed to Load Secret`} />
  if (!secret) return <Status status="empty" title={t`Secret Not Found`} />

  const handleRevealPayload = async () => {
    await fetchPayload()
    setShowPayload(true)
  }

  return (
    <div className="max-w-3xl">
      <ContentHeader
        title={secret.name ?? t`Unnamed Secret`}
        projectId={projectId}
        actions={
          <Button variant="subdued" onClick={onBack}>
            {t`← Back to Secrets`}
          </Button>
        }
      />

      <dl className="juno-dl">
        <dt>{t`ID`}</dt>
        <dd>
          <ClipboardText text={secretId} />
        </dd>

        <dt>{t`Reference`}</dt>
        <dd>
          <ClipboardText text={secret.secret_ref} />
        </dd>

        <dt>{t`Name`}</dt>
        <dd>{secret.name ?? <em>—</em>}</dd>

        <dt>{t`Status`}</dt>
        <dd>{secret.status}</dd>

        <dt>{t`Secret Type`}</dt>
        <dd>{secret.secret_type}</dd>

        <dt>{t`Algorithm`}</dt>
        <dd>{secret.algorithm ?? "—"}</dd>

        <dt>{t`Bit Length`}</dt>
        <dd>{secret.bit_length ?? "—"}</dd>

        <dt>{t`Mode`}</dt>
        <dd>{secret.mode ?? "—"}</dd>

        {secret.content_types && (
          <>
            <dt>{t`Content Types`}</dt>
            <dd>
              {Object.entries(secret.content_types)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}
            </dd>
          </>
        )}

        <dt>{t`Expiration`}</dt>
        <dd>{secret.expiration ? new Date(secret.expiration).toLocaleString() : t`Never`}</dd>

        <dt>{t`Created`}</dt>
        <dd>{new Date(secret.created).toLocaleString()}</dd>

        <dt>{t`Updated`}</dt>
        <dd>{new Date(secret.updated).toLocaleString()}</dd>

        {secret.creator_id && (
          <>
            <dt>{t`Creator ID`}</dt>
            <dd>{secret.creator_id}</dd>
          </>
        )}
      </dl>

      <div className="mt-4">
        {!showPayload ? (
          <Button variant="subdued" onClick={handleRevealPayload} disabled={payloadFetching}>
            {payloadFetching ? t`Loading payload...` : t`Reveal Payload`}
          </Button>
        ) : payloadError ? (
          <Message variant="error">{t`Failed to load payload.`}</Message>
        ) : payloadData ? (
          <div className="mt-2">
            <p className="mb-1 text-sm font-medium">
              {t`Payload`}
              <span className="ml-2 text-xs opacity-60">({payloadData.contentType})</span>
            </p>
            <pre className="bg-theme-background-lvl-2 max-h-48 overflow-auto rounded p-3 text-xs">
              {payloadData.payload}
            </pre>
            <div className="mt-1 flex gap-2">
              <Button
                size="small"
                variant="subdued"
                onClick={() => void navigator.clipboard.writeText(payloadData.payload)}
                label={t`Copy`}
              />
              <Button size="small" variant="subdued" onClick={() => setShowPayload(false)} label={t`Hide`} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
