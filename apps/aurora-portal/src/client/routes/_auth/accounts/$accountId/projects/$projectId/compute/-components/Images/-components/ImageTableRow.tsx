import { ToastProps, auroraToast, sonnerToast } from "@/client/components/NotificationCenter/AuroraToast"
import { Button } from "@cloudoperators/juno-ui-components"
import { Icon } from "@cloudoperators/juno-ui-components"
import { GlanceImage } from "@/server/Compute/types/image"
import { StatusBadge } from "./StatusBadge"
import { VisibilityBadge } from "./VisibilityBadge"
import { SizeDisplay } from "./SizeDisplay"

interface ImageTableRowProps {
  image: GlanceImage
  onEdit: (image: GlanceImage) => void
  onDelete: (image: GlanceImage) => void
  isLast: boolean
}

export function ImageTableRow({ image, onEdit, onDelete, isLast }: ImageTableRowProps) {
  return (
    <tr key={image.id} className={`hover:bg-[#1e2531] ${!isLast ? "border-b border-[#30363d]" : ""}`}>
      <td className="p-3">{image.name || "Unnamed"}</td>
      <td className="p-3">
        <StatusBadge status={image.status} />
      </td>
      <td className="p-3">
        <VisibilityBadge visibility={image.visibility} />
      </td>
      <td className="p-3">
        <SizeDisplay size={image.size} />
      </td>
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
