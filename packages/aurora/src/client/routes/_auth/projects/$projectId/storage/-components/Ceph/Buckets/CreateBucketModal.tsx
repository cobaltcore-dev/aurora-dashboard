import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, TextInput, Stack, Checkbox } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface CreateBucketModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

// S3 bucket naming validation patterns
const S3_BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/
const IP_ADDRESS_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/
const RESERVED_PREFIXES = ["xn--", "sthree-", "amzn-s3-demo-"]
const RESERVED_SUFFIXES = ["-s3alias", "--ol-s3", ".mrap", "--x-s3", "--table-s3"]

export const CreateBucketModal = ({ isOpen, onClose, onSuccess, onError }: CreateBucketModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const [bucketName, setBucketName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [enableVersioning, setEnableVersioning] = useState(false)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.create",
  })

  const utils = trpcReact.useUtils()

  const createBucketMutation = trpcReact.storage.ceph.containers.create.useMutation({
    onSuccess: () => {
      utils.storage.ceph.containers.list.invalidate()
      const name = bucketName.trim()
      onSuccess?.(name)
    },
    onError: (error) => {
      onError?.(bucketName.trim(), error.message)
    },
    onSettled: () => {
      handleClose()
    },
  })

  const handleClose = () => {
    trackClose()
    setBucketName("")
    setNameError(null)
    setEnableVersioning(false)
    resetTracking()
    createBucketMutation.reset()
    onClose()
  }

  const validateName = (name: string): boolean => {
    const trimmed = name.trim()

    // Length validation
    if (!trimmed) {
      setNameError(t`Bucket name is required`)
      return false
    }
    if (trimmed.length < 3) {
      setNameError(t`Bucket name must be at least 3 characters`)
      return false
    }
    if (trimmed.length > 63) {
      setNameError(t`Bucket name must be 63 characters or fewer`)
      return false
    }

    // Character set validation (lowercase letters, numbers, periods, hyphens)
    if (!S3_BUCKET_NAME_REGEX.test(trimmed)) {
      setNameError(t`Bucket name must contain only lowercase letters, numbers, periods, and hyphens`)
      return false
    }

    // Must start and end with letter or number (already covered by regex, but explicit message)
    if (!/^[a-z0-9]/.test(trimmed) || !/[a-z0-9]$/.test(trimmed)) {
      setNameError(t`Bucket name must start and end with a letter or number`)
      return false
    }

    // No consecutive periods
    if (trimmed.includes("..")) {
      setNameError(t`Bucket name must not contain consecutive periods`)
      return false
    }

    // Not formatted as IP address
    if (IP_ADDRESS_REGEX.test(trimmed)) {
      setNameError(t`Bucket name must not be formatted as an IP address`)
      return false
    }

    // Check reserved prefixes
    for (const prefix of RESERVED_PREFIXES) {
      if (trimmed.startsWith(prefix)) {
        setNameError(t`Bucket name must not start with reserved prefix "${prefix}"`)
        return false
      }
    }

    // Check reserved suffixes
    for (const suffix of RESERVED_SUFFIXES) {
      if (trimmed.endsWith(suffix)) {
        setNameError(t`Bucket name must not end with reserved suffix "${suffix}"`)
        return false
      }
    }

    setNameError(null)
    return true
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBucketName(value)
    if (nameError) validateName(value)
  }

  const handleSubmit = () => {
    if (!validateName(bucketName)) return
    markSubmitted()
    createBucketMutation.mutate({
      project_id: projectId,
      bucketName: bucketName.trim(),
      enableVersioning,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      title={t`Create Bucket`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Create`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={createBucketMutation.isPending || !bucketName.trim()}
    >
      <Stack direction="vertical" gap="6">
        <p className="text-theme-default">
          <Trans>
            S3 bucket names must be 3-63 characters long and contain only lowercase letters, numbers, periods, and
            hyphens. They must start and end with a letter or number, and be globally unique within the cluster.
          </Trans>
        </p>
        <TextInput
          label={t`Bucket name`}
          required
          value={bucketName}
          onChange={handleNameChange}
          onKeyDown={handleKeyDown}
          invalid={!!nameError}
          errortext={nameError || undefined}
          disabled={createBucketMutation.isPending}
          autoFocus
          placeholder={t`my-bucket-name`}
        />
        <Checkbox
          label={t`Enable versioning`}
          helptext={t`Keep multiple versions of objects. Cannot be fully disabled once enabled, only suspended.`}
          checked={enableVersioning}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEnableVersioning(e.target.checked)}
          disabled={createBucketMutation.isPending}
        />
      </Stack>
    </Modal>
  )
}
