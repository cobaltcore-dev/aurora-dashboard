import { useState } from "react"
import { Button, Status, Message, Stack, ContentHeading } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"
import { TwoColumnDescriptionList, type DetailListItem } from "@/client/components/TwoColumnDescriptionList"
import ClipboardText from "@/client/components/ClipboardText"
import { useKeyManagerPermissions } from "@/client/routes/_auth/projects/$projectId/authorization/key-manager/-components/useKeyManagerPermissions"
import { StatusLabel } from "@/client/components/StatusLabel"

interface SecretDetailsViewProps {
  projectId: string
  secretId: string
}

export function SecretDetailsView({ projectId, secretId }: SecretDetailsViewProps) {
  const { t } = useLingui()
  const [showPayload, setShowPayload] = useState(false)

  // Payload exposes the raw secret material; fail-closed until the dedicated permission resolves.
  const { permissions, isLoading: permissionsLoading } = useKeyManagerPermissions(projectId, [
    "key-manager:secrets:get",
    "key-manager:secrets:payload",
  ])
  const canGet = permissions["key-manager:secrets:get"]
  const canRevealPayload = permissions["key-manager:secrets:payload"]

  const {
    data: secret,
    isLoading,
    isError,
    error,
  } = trpcReact.keyManager.getSecret.useQuery(
    {
      project_id: projectId,
      secretId,
    },
    { enabled: canGet }
  )

  const {
    data: payloadData,
    isFetching: payloadFetching,
    isError: payloadError,
    refetch: fetchPayload,
  } = trpcReact.keyManager.getSecretPayload.useQuery(
    // Pass the secret's own content-type so the server can send the matching Accept header.
    // secret may not be loaded yet (undefined); the query is disabled until the user clicks Reveal.
    { project_id: projectId, secretId, payloadContentType: secret?.content_types?.default ?? undefined },
    { enabled: false }
  )

  if (permissionsLoading) return null
  if (!canGet)
    return (
      <Status
        status="error"
        title={t`Access Denied`}
        body={t`You do not have the necessary permissions to view this Secret.`}
      />
    )
  if (isLoading) return <Status status="progress" title={t`Loading Secret...`} />
  if (isError) return <Status status="error" title={error?.message ?? t`Failed to Load Secret`} />
  if (!secret) return <Status status="empty" title={t`Secret Not Found`} />

  const handleRevealPayload = async () => {
    if (!canRevealPayload) return
    await fetchPayload()
    setShowPayload(true)
  }

  const handleDownload = () => {
    if (!payloadData) return
    const contentType = payloadData.contentType
    const isBase64 = payloadData.encoding === "base64"
    let blobPart: BlobPart
    if (isBase64) {
      const binary = atob(payloadData.payload)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      blobPart = bytes
    } else {
      blobPart = payloadData.payload
    }
    const ext =
      contentType === "text/plain"
        ? "txt"
        : contentType === "application/x-pem-file" || contentType === "application/pkix-cert"
          ? "pem"
          : "bin"
    const blob = new Blob([blobPart], { type: contentType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${secretId}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const contentTypes = secret.content_types
    ? Object.entries(secret.content_types)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "- -"

  const detailItems: DetailListItem[] = [
    { label: t`ID`, value: <ClipboardText text={secretId} /> },
    { label: t`Reference`, value: <ClipboardText text={secret.secret_ref} /> },
    { label: t`Name`, value: secret.name ?? "- -" },
    { label: t`Status`, value: <StatusLabel value={secret.status} /> },
    { label: t`Secret Type`, value: secret.secret_type },
    { label: t`Algorithm`, value: secret.algorithm ?? "- -" },
    { label: t`Bit Length`, value: secret.bit_length ?? "- -" },
    { label: t`Mode`, value: secret.mode ?? "- -" },
    { label: t`Content Types`, value: contentTypes },
    { label: t`Expiration`, value: secret.expiration ? new Date(secret.expiration).toLocaleString() : t`Never` },
    { label: t`Created`, value: new Date(secret.created).toLocaleString() },
    { label: t`Updated`, value: new Date(secret.updated).toLocaleString() },
    { label: t`Creator ID`, value: secret.creator_id ?? "- -" },
  ]

  return (
    <>
      <ContentHeader title={secret.name ?? secretId} projectId={projectId} />

      <Stack direction="vertical" gap="6" className="mt-6">
        <Stack direction="vertical" gap="2">
          <ContentHeading>{t`Secret Details`}</ContentHeading>
          <TwoColumnDescriptionList items={detailItems} />
        </Stack>

        {canRevealPayload && (
          <Stack direction="vertical" gap="2">
            <ContentHeading>{t`Payload`}</ContentHeading>
            {!showPayload ? (
              <div>
                <Button variant="subdued" onClick={handleRevealPayload} disabled={payloadFetching}>
                  {payloadFetching ? t`Loading Payload...` : t`Reveal Payload`}
                </Button>
              </div>
            ) : payloadError ? (
              <Message variant="error" text={t`Failed to load payload.`} />
            ) : payloadData ? (
              <Stack direction="vertical" gap="2">
                <p className="text-sm opacity-60">
                  {payloadData.encoding === "base64"
                    ? `${payloadData.contentType} ${t`(base64-encoded)`}`
                    : payloadData.contentType}
                </p>
                <pre className="bg-theme-background-lvl-2 max-h-48 overflow-auto rounded p-4 text-xs">
                  {payloadData.payload}
                </pre>
                <Stack gap="2">
                  <Button
                    size="small"
                    variant="subdued"
                    onClick={() => void navigator.clipboard.writeText(payloadData.payload)}
                    label={t`Copy`}
                  />
                  <Button size="small" variant="subdued" onClick={handleDownload} label={t`Download`} />
                  <Button size="small" variant="subdued" onClick={() => setShowPayload(false)} label={t`Hide`} />
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        )}
      </Stack>
    </>
  )
}
