import { useState } from "react"
import { Button, Status, Message } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { copyToClipboard } from "../../-components/utils"

interface SecretDetailProps {
  projectId: string
  secretId: string
  onBack: () => void
}

export function SecretDetail({ projectId, secretId, onBack }: SecretDetailProps) {
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

  if (isLoading) return <Status status="progress" title="Loading Secret..." />
  if (isError) return <Status status="error" title={error?.message ?? "Failed to Load Secret"} />
  if (!secret) return <Status status="empty" title="Secret Not Found" />

  const handleRevealPayload = async () => {
    await fetchPayload()
    setShowPayload(true)
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{secret.name ?? "Unnamed Secret"}</h2>
        <Button variant="subdued" onClick={onBack}>
          ← Back to Secrets
        </Button>
      </div>

      <dl className="juno-dl">
        <dt>ID</dt>
        <dd className="flex items-center gap-2">
          {secretId}
          <Button size="small" variant="subdued" onClick={() => copyToClipboard(secretId)} label="Copy" />
        </dd>

        <dt>Reference</dt>
        <dd className="flex items-center gap-2">
          {secret.secret_ref}
          <Button size="small" variant="subdued" onClick={() => copyToClipboard(secret.secret_ref)} label="Copy" />
        </dd>

        <dt>Name</dt>
        <dd>{secret.name ?? <em>—</em>}</dd>

        <dt>Status</dt>
        <dd>{secret.status}</dd>

        <dt>Secret Type</dt>
        <dd>{secret.secret_type}</dd>

        <dt>Algorithm</dt>
        <dd>{secret.algorithm ?? "—"}</dd>

        <dt>Bit Length</dt>
        <dd>{secret.bit_length ?? "—"}</dd>

        <dt>Mode</dt>
        <dd>{secret.mode ?? "—"}</dd>

        {secret.content_types && (
          <>
            <dt>Content Types</dt>
            <dd>
              {Object.entries(secret.content_types)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}
            </dd>
          </>
        )}

        <dt>Expiration</dt>
        <dd>{secret.expiration ? new Date(secret.expiration).toLocaleString() : "Never"}</dd>

        <dt>Created</dt>
        <dd>{new Date(secret.created).toLocaleString()}</dd>

        <dt>Updated</dt>
        <dd>{new Date(secret.updated).toLocaleString()}</dd>

        {secret.creator_id && (
          <>
            <dt>Creator ID</dt>
            <dd>{secret.creator_id}</dd>
          </>
        )}
      </dl>

      <div className="mt-4">
        {!showPayload ? (
          <Button variant="subdued" onClick={handleRevealPayload} disabled={payloadFetching}>
            {payloadFetching ? "Loading payload..." : "Reveal Payload"}
          </Button>
        ) : payloadError ? (
          <Message variant="error">Failed to load payload.</Message>
        ) : payloadData ? (
          <div className="mt-2">
            <p className="mb-1 text-sm font-medium">
              Payload
              <span className="ml-2 text-xs opacity-60">({payloadData.contentType})</span>
            </p>
            <pre className="bg-theme-background-lvl-2 max-h-48 overflow-auto rounded p-3 text-xs">
              {payloadData.payload}
            </pre>
            <div className="mt-1 flex gap-2">
              <Button
                size="small"
                variant="subdued"
                onClick={() => copyToClipboard(payloadData.payload)}
                label="Copy"
              />
              <Button size="small" variant="subdued" onClick={() => setShowPayload(false)} label="Hide" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
