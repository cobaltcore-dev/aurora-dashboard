import { useState, useRef } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Modal, Stack, Message, Spinner } from "@cloudoperators/juno-ui-components"
import { trpcReact } from "@/client/trpcClient"
import { cn } from "@/client/utils/cn"
import { formatBytesBinary } from "@/client/utils/formatBytes"

interface UploadObjectModalProps {
  isOpen: boolean
  currentPrefix: string
  container: string
  account?: string
  onClose: () => void
  onSuccess?: (objectName: string) => void
  onError?: (objectName: string, errorMessage: string) => void
}

export const UploadObjectModal = ({
  isOpen,
  currentPrefix,
  container,
  account,
  onClose,
  onSuccess,
  onError,
}: UploadObjectModalProps) => {
  const { t } = useLingui()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const submittedNameRef = useRef("")

  const utils = trpcReact.useUtils()

  const uploadMutation = trpcReact.storage.swift.uploadObject.useMutation()

  // Subscribe to upload progress — uploadId set client-side before mutateAsync
  // so subscription is active from the very first byte.
  const { data: uploadProgress } = trpcReact.storage.swift.watchUploadProgress.useSubscription(
    { uploadId: uploadId ?? "" },
    { enabled: !!uploadId && uploadMutation.isPending }
  )

  const handleClose = () => {
    if (uploadMutation.isPending) return
    setSelectedFile(null)
    setFileError(null)
    setIsDragging(false)
    setUploadId(null)
    setUploadError(null)
    uploadMutation.reset()
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
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
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

    const objectName = `${currentPrefix}${selectedFile.name}`
    submittedNameRef.current = selectedFile.name
    setUploadError(null)

    const formData = new FormData()
    formData.append("container", container)
    formData.append("object", objectName)
    formData.append("contentType", selectedFile.type || "application/octet-stream")
    formData.append("fileSize", String(selectedFile.size))
    if (account) formData.append("account", account)
    // file must be last — BFF iterates fields before the file stream
    formData.append("file", selectedFile)

    // Compute uploadId client-side before mutateAsync — subscription must be
    // active before the first progress event fires from the BFF.
    setUploadId(`${container}:${objectName}`)

    try {
      await uploadMutation.mutateAsync(formData)

      utils.storage.swift.listObjects.invalidate({ container })
      onSuccess?.(submittedNameRef.current)
      handleClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setUploadError(message)
      onError?.(submittedNameRef.current, message)
    } finally {
      setUploadId(null)
    }
  }

  const isPending = uploadMutation.isPending
  const progressPct = uploadProgress?.percent ?? null

  if (!isOpen) return null

  const parentPath = currentPrefix || "/"

  return (
    <Modal
      title={
        <span className="flex max-w-[400px] items-center gap-1">
          <span className="shrink-0">
            <Trans>Upload object to:</Trans>
          </span>
          <span className="truncate font-mono" title={parentPath}>
            {parentPath}
          </span>
        </span>
      }
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={isPending ? t`Uploading...` : t`Upload`}
      onConfirm={handleSubmit}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={isPending || !selectedFile}
    >
      <Stack direction="vertical" gap="4">
        {/* File drop zone — mirrors CreateImageModal pattern */}
        <div>
          <label
            htmlFor="upload-object-file"
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
              isDragging
                ? "border-theme-accent bg-theme-background-lvl-2"
                : "border-theme-background-lvl-4 hover:border-theme-accent hover:bg-theme-background-lvl-1",
              isPending && "cursor-not-allowed opacity-60"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-2 text-3xl">📁</div>
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
          <div className="flex flex-col gap-1">
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

        {/* Object path preview */}
        {selectedFile && !isPending && (
          <Message variant="info">
            <Trans>
              Object will be uploaded as:{" "}
              <span className="font-mono font-semibold">
                {currentPrefix}
                {selectedFile.name}
              </span>
            </Trans>
          </Message>
        )}

        {/* Upload error */}
        {uploadError && (
          <Message variant="danger">
            <Trans>Upload failed: {uploadError}</Trans>
          </Message>
        )}
      </Stack>
    </Modal>
  )
}
