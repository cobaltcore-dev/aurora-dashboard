// export default ImagesPage
import { ToastProps, auroraToast, sonnerToast } from "@/client/components/NotificationCenter/AuroraToast"
import { Button } from "@cloudoperators/juno-ui-components"
import { Icon } from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"

// Utility function to format bytes
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

// Helper function to format status with appropriate icon
const renderStatus = (status: string | undefined) => {
  if (!status) return <span>Unknown</span>

  return (
    <div className="flex items-center space-x-2">
      {status === "active" ? (
        <Icon icon="success" color="jn-text-theme-success" />
      ) : status === "deleted" || status === "killed" ? (
        <Icon icon="danger" color="jn-text-theme-danger" />
      ) : status === "queued" || status === "saving" || status === "importing" ? (
        <Icon icon="info" color="jn-text-theme-warning" />
      ) : (
        <Icon icon="info" color="jn-text-theme-info" />
      )}
      <span>{status}</span>
    </div>
  )
}

// Helper function to format visibility with appropriate icon
const renderVisibility = (visibility: string | undefined) => {
  if (!visibility) return <span>Unknown</span>

  return (
    <div className="flex items-center space-x-2">
      {visibility === "public" ? (
        <Icon icon="info" color="jn-text-theme-info" />
      ) : visibility === "private" ? (
        <Icon icon="info" color="jn-text-theme-warning" />
      ) : visibility === "shared" ? (
        <Icon icon="info" color="jn-text-theme-success" />
      ) : (
        <span>{visibility}</span>
      )}
      <span>{visibility}</span>
    </div>
  )
}
interface ImageTableRowProps {
  image: GlanceImage
  onEdit: (image: GlanceImage) => void
  onDelete: (image: GlanceImage) => void
  isLast: boolean
}
// Helper function to format size
const formatSize = (size: number | undefined) => {
  if (size === undefined) return "N/A"
  return formatBytes(size)
}

export function ImageTableRow({ image, onEdit, onDelete, isLast }: ImageTableRowProps) {
  return (
    <tr key={image.id} className={`hover:bg-[#1e2531] ${!isLast ? "border-b border-[#30363d]" : ""}`}>
      <td className="p-3">{image.name || "Unnamed"}</td>
      <td className="p-3">{renderStatus(image.status)}</td>
      <td className="p-3">{renderVisibility(image.visibility)}</td>
      <td className="p-3">{formatSize(image.size)}</td>
      <td className="p-3">{image.disk_format || "N/A"}</td>
      <td className="p-3">
        {image.os_type ? (
          <div className="flex items-center space-x-2">
            <Icon icon={"info"} color="jn-text-theme-info" />
            <span>{image.os_type}</span>
            {image.os_distro && <span className="text-xs text-gray-400">({image.os_distro})</span>}
          </div>
        ) : (
          "N/A"
        )}
      </td>
      <td className="p-3">{image.created_at ? new Date(image.created_at).toLocaleDateString() : "N/A"}</td>
      {/* Action Buttons */}
      <td className="p-3">
        <div className="flex space-x-3 mt-4 justify-end">
          <Button
            className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/20"
            onClick={() => {
              const toastProps: Omit<ToastProps, "id"> = {
                title: "Launch Instance",
                description: `Launching instance from image "${image.name || "Unnamed"}"`,
                variant: "success",
                button: {
                  label: "Dismiss",
                  onClick: () => sonnerToast.dismiss(),
                },
              }
              auroraToast(toastProps)
            }}
          >
            Launch
          </Button>
          <Button className="hover:bg-gray-600" onClick={() => onEdit(image)}>
            Edit
          </Button>
          <Button variant="primary-danger" className="hover:bg-red-500" onClick={() => onDelete(image)}>
            Delete
          </Button>
        </div>
      </td>
    </tr>
  )
}
