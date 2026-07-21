import { useState, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Stack, Spinner } from "@cloudoperators/juno-ui-components"
import { MdCloudUpload } from "react-icons/md"
import { trpcClient, trpcReact } from "@/client/trpcClient"
import { cn } from "@/client/utils/cn"
import { formatBytesBinary } from "@/client/utils/formatBytes"

interface UploadObjectModalProps {
  isOpen: boolean
  currentPrefix: string
  bucketName: string
  projectId: string
  onClose: () => void
  onSuccess?: (objectName: string) => void
  onError?: (objectName: string, errorMessage: string) => void
  onCancelled?: (objectName: string) => void
}

export const UploadObjectModal = ({
  isOpen,
  currentPrefix,
  bucketName,
  projectId,
  onClose,
  onSuccess,
  onError,
  onCancelled,
}: UploadObjectModalProps) => {
  const { t } = useLingui()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const submittedNameRef = useRef("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const utils = trpcReact.useUtils()

  const handleCancelUpload = () => {
    abortControllerRef.current?.abort()
  }

  // Subscribe to upload progress — uploadId is set before the upload starts
  // so the subscription is active from the very first byte. The BFF scopes the
  // id with project_id, so we pass it here too (mirrors watchDownloadProgress).
  const { data: uploadProgress } = trpcReact.storage.ceph.objects.watchUploadProgress.useSubscription(
    { project_id: projectId, uploadId: uploadId ?? "" },
    { enabled: !!uploadId && !!projectId && isPending }
  )

  const handleClose = () => {
    if (isPending) return
    resetAndClose()
  }

  const resetAndClose = () => {
    setSelectedFile(null)
    setFileError(null)
    setIsDragging(false)
    setUploadId(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileError(null)
      setUploadError(null)
      setSelectedFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (isPending) return
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (isPending) return
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (isPending) return
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setFileError(null)
      setUploadError(null)
      setSelectedFile(file)
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) {
      setFileError(t`Please select a file to upload`)
      return
    }

    const objectKey = `${currentPrefix}${selectedFile.name}`
    const activeUploadId = `${bucketName}:${objectKey}:${crypto.randomUUID()}`
    submittedNameRef.current = selectedFile.name
    setUploadError(null)

    const controller = new AbortController()
    abortControllerRef.current = controller

    // Compute uploadId client-side before upload starts — the subscription must
    // be active before the first progress event fires from the BFF.
    setUploadId(activeUploadId)
    setIsPending(true)

    try {
      // Metadata is sent as custom headers via tRPC operation context —
      // no shared mutable state, safe for concurrent uploads.
      const uploadContext = {
        headers: {
          "x-upload-project-id": projectId,
          "x-upload-container": bucketName,
          "x-upload-object": objectKey,
          "x-upload-type": selectedFile.type || "application/octet-stream",
          "x-upload-size": String(selectedFile.size),
          "x-upload-id": activeUploadId,
        },
      }

      await trpcClient.storage.ceph.objects.uploadObject.mutate(selectedFile, {
        context: uploadContext,
        signal: controller.signal,
      })

      utils.storage.ceph.objects.list.invalidate({ containerName: bucketName })
      onSuccess?.(submittedNameRef.current)
      resetAndClose()
    } catch (err) {
      const isAborted =
        err instanceof Error &&
        (err.name === "AbortError" ||
          err.message === "Request canceled" ||
          err.message.includes("signal is aborted") ||
          err.message.includes("aborted"))
      if (isAborted) {
        onCancelled?.(submittedNameRef.current)
        resetAndClose()
        return
      }
      const message = err instanceof Error ? err.message : String(err)
      setUploadError(message)
      onError?.(submittedNameRef.current, message)
    } finally {
      setIsPending(false)
      setUploadId(null)
      abortControllerRef.current = null
    }
  }

  // isPending is tracked via useState above
  const progressPct = uploadProgress?.percent ?? null

  if (!isOpen) return null

  const parentPath = currentPrefix || "/"
  const selectedObjectName = selectedFile ? `${currentPrefix}${selectedFile.name}` : ""

  return (
    <Modal
      title={
        <span className="flex max-w-[400px] items-center gap-1">
          <span className="shrink-0">
            <Trans>Upload object to:</Trans>
          </span>
          <span className="truncate" title={parentPath}>
            {parentPath}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={isPending ? handleCancelUpload : handleClose}
      confirmButtonLabel={isPending ? t`Uploading...` : t`Upload`}
      onConfirm={handleSubmit}
      cancelButtonLabel={isPending ? t`Cancel upload` : t`Cancel`}
      size="small"
      disableConfirmButton={isPending || !selectedFile}
      disableCloseButton={isPending}
    >
      <Stack direction="vertical" gap="4">
        {/* Upload error */}
        {uploadError && (
          <p className="text-theme-error">
            <Trans>Upload failed: {uploadError}</Trans>
          </p>
        )}

        {/* Object path preview */}
        {selectedFile && !isPending && (
          <p className="text-theme-default">
            <Trans>
              Object will be uploaded as: <span className="font-semibold">{selectedObjectName}</span>
            </Trans>
          </p>
        )}

        {/* File drop zone — mirrors CreateImageModal pattern */}
        <div>
          <label
            htmlFor="upload-object-file"
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
              isDragging
                ? "border-theme-accent bg-theme-background-lvl-2"
                : isPending
                  ? "border-theme-background-lvl-4 pointer-events-none cursor-not-allowed opacity-60"
                  : "border-theme-background-lvl-4 hover:border-theme-accent hover:bg-theme-background-lvl-1 cursor-pointer"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <MdCloudUpload className="text-theme-light mb-2" size={40} />
            <p className="text-theme-default text-sm font-medium">
              {isDragging ? (
                <span>{t`Drop your file here`}</span>
              ) : (
                <>
                  <span className="font-semibold">{t`Click to upload`}</span> {t`or drag and drop`}
                </>
              )}
            </p>
            <p className="text-theme-light mt-1 text-xs">{t`Any file type`}</p>
            <input
              ref={fileInputRef}
              id="upload-object-file"
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={isPending}
            />
          </label>

          {/* Selected file info */}
          {selectedFile && (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="truncate text-gray-700">{selectedFile.name}</span>
                <span className="shrink-0 text-gray-400">({formatBytesBinary(selectedFile.size)})</span>
              </div>
              {!isPending && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    setFileError(null)
                    setUploadError(null)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                  className="ml-2 shrink-0 font-medium text-red-600 hover:text-red-800"
                >
                  {t`Remove`}
                </button>
              )}
            </div>
          )}

          {fileError && <p className="mt-1 text-xs text-red-600">{fileError}</p>}
        </div>

        {/* Upload progress */}
        {isPending && (
          <div className="flex flex-col gap-2">
            <span className="text-theme-light flex items-center gap-2 text-sm">
              <Spinner size="small" />
              {progressPct !== null ? <Trans>Uploading... {progressPct}%</Trans> : <Trans>Uploading...</Trans>}
            </span>
            {progressPct !== null && (
              <div className="bg-theme-background-lvl-2 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-theme-accent h-1.5 rounded-full transition-all duration-150"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>
        )}
      </Stack>
    </Modal>
  )
}
