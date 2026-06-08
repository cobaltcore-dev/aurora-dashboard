import { useState } from "react"
import { Trans } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { Button, Stack, Toast, ToastProps } from "@cloudoperators/juno-ui-components"

interface CredentialPromptProps {
  onSuccess: () => void
}

export function CredentialPrompt({ onSuccess }: CredentialPromptProps) {
  const projectId = useProjectId()
  const [toast, setToast] = useState<ToastProps | null>(null)
  const utils = trpcReact.useUtils()

  const createMutation = trpcReact.storage.ceph.ec2Credentials.create.useMutation({
    onSuccess: () => {
      utils.storage.ceph.ec2Credentials.list.invalidate()
      onSuccess()
    },
    onError: (err) => {
      const errorMessage = err.message
      setToast({
        variant: "error",
        children: <Trans>Failed to create credential: {errorMessage}</Trans>,
        autoDismiss: true,
        autoDismissTimeout: 5000,
        onDismiss: () => setToast(null),
      })
    },
  })

  return (
    <Stack direction="vertical" gap="4" className="mx-auto mt-16 max-w-lg">
      {toast && <Toast {...toast} />}
      <h2 className="text-lg font-semibold">
        <Trans>S3 Object Storage — Setup Required</Trans>
      </h2>
      <p className="text-juno-grey-light-1">
        <Trans>
          To access S3 Object Storage, you need EC2 credentials (access key + secret key). These credentials
          authenticate your requests to the Ceph storage backend.
        </Trans>
      </p>
      <p className="text-juno-grey-light-1 text-sm">
        <Trans>
          Click the button below to automatically generate credentials for this project. You only need to do this once.
        </Trans>
      </p>
      <div>
        <Button
          onClick={() => projectId && createMutation.mutate({ project_id: projectId })}
          disabled={createMutation.isPending || !projectId}
        >
          {createMutation.isPending ? <Trans>Creating Credentials...</Trans> : <Trans>Create S3 Credentials</Trans>}
        </Button>
      </div>
    </Stack>
  )
}
