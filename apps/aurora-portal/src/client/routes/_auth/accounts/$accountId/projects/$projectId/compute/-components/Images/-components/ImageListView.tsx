// export default ImagesPage
import { ToastProps, auroraToast, sonnerToast } from "@/client/components/NotificationCenter/AuroraToast"
import type { GlanceImage } from "@/server/Compute/types/image"
import { Button } from "@/client/components/Button"
import { Icon } from "@/client/components/Icon"
interface ImagePageProps {
  images: GlanceImage[]
}

// Utility function to format bytes
export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

export function ImageListView({ images }: ImagePageProps) {
  // Helper function to format status with appropriate icon
  const renderStatus = (status: string | undefined) => {
    if (!status) return <span>Unknown</span>

    return (
      <div className="flex items-center space-x-2">
        {status === "active" ? (
          <Icon name="success" color="jn-text-theme-success" />
        ) : status === "deleted" || status === "killed" ? (
          <Icon name="danger" color="jn-text-theme-danger" />
        ) : status === "queued" || status === "saving" || status === "importing" ? (
          <Icon name="info" color="jn-text-theme-warning" />
        ) : (
          <Icon name="info" color="jn-text-theme-info" />
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
          <Icon name="info" color="jn-text-theme-info" />
        ) : visibility === "private" ? (
          <Icon name="info" color="jn-text-theme-warning" />
        ) : visibility === "shared" ? (
          <Icon name="info" color="jn-text-theme-success" />
        ) : (
          <span>{visibility}</span>
        )}
        <span>{visibility}</span>
      </div>
    )
  }

  // Helper function to format size
  const formatSize = (size: number | undefined) => {
    if (size === undefined) return "N/A"
    return formatBytes(size)
  }

  return (
    <div>
      {images && images.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-[#30363d] text-gray-300">
            {/* Table Header */}
            <thead className="bg-[#21262d]">
              <tr className="text-gray-400 border-b border-[#30363d]">
                <th className="p-3">Image Name</th>
                <th className="p-3">Status</th>
                <th className="p-3">Visibility</th>
                <th className="p-3">Size</th>
                <th className="p-3">Disk Format</th>
                <th className="p-3">OS Type</th>
                <th className="p-3">Created</th>
                <th className="p-3 flex justify-center">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {images.map((image, index) => (
                <tr
                  key={image.id}
                  className={`hover:bg-[#1e2531] ${index !== images.length - 1 ? "border-b border-[#30363d]" : ""}`}
                >
                  <td className="p-3">{image.name || "Unnamed"}</td>
                  <td className="p-3">{renderStatus(image.status)}</td>
                  <td className="p-3">{renderVisibility(image.visibility)}</td>
                  <td className="p-3">{formatSize(image.size)}</td>
                  <td className="p-3">{image.disk_format || "N/A"}</td>
                  <td className="p-3">
                    {image.os_type ? (
                      <div className="flex items-center space-x-2">
                        <Icon name={"info"} color="jn-text-theme-info" />
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
                        variant="success"
                        className="hover:bg-gray-600"
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
                      <Button
                        className="hover:bg-gray-600"
                        onClick={() => {
                          const toastProps: Omit<ToastProps, "id"> = {
                            title: "Image Details",
                            description: `Viewing details for "${image.name || "Unnamed"}"`,
                            variant: "info",
                            button: {
                              label: "Close",
                              onClick: () => sonnerToast.dismiss(),
                            },
                          }
                          auroraToast(toastProps)
                        }}
                      >
                        Details
                      </Button>
                      <Button
                        variant="primary-danger"
                        className="hover:bg-red-500"
                        onClick={() => {
                          const toastProps: Omit<ToastProps, "id"> = {
                            title: "Delete Image",
                            description: `Are you sure you want to delete "${image.name || "Unnamed"}"?`,
                            variant: "error",
                            button: {
                              label: "Cancel",
                              onClick: () => sonnerToast.dismiss(),
                            },
                          }
                          auroraToast(toastProps)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-400">No images available.</p>
      )}
    </div>
  )
}
