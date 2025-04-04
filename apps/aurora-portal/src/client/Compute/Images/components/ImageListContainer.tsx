import { useEffect, useState } from "react"
import { ImageListView } from "./ImageListView"
import type { GlanceImage } from "../../../../server/Compute/types/image"
import { ToastProps, auroraToast } from "../../../Shell/NotificationCenter/AuroraToast"
import { TrpcClient } from "../../../trpcClient"

type ImageListContainerProps = {
  projectId: string
  client: TrpcClient
}

export function ImageListContainer({ projectId, client }: ImageListContainerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [images, setImages] = useState<GlanceImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [refreshCounter, setRefreshCounter] = useState(0)

  // Simple fetch function
  const fetchImages = async () => {
    if (!projectId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await client.compute.getImagesByProjectId.query({ projectId })
      console.log("Fetched images:", data)
      if (data) {
        setImages(data)
      }
      //@ts-ignore
    } catch (err: any) {
      const errorMessage = err?.message || "Unknown error occurred"
      setError(`Failed to load images: ${errorMessage}`)

      // Show error toast
      const toastProps: Omit<ToastProps, "id"> = {
        title: "Error Loading Images",
        description: errorMessage,
        variant: "error",
        button: {
          label: "Retry",
          onClick: () => handleRefresh(),
        },
      }
      auroraToast(toastProps)
    } finally {
      setIsLoading(false)
    }
  }

  // Function to trigger a refresh
  const handleRefresh = () => {
    setRefreshCounter((prev) => prev + 1)
  }

  // Fetch data when component mounts or when projectId/refreshCounter changes
  useEffect(() => {
    fetchImages()
  }, [projectId, refreshCounter])

  if (isLoading) {
    return <div className="p-4 text-center text-gray-400">Loading images...</div>
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        <p>{error}</p>
        <button className="mt-2 p-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={handleRefresh}>
          Retry
        </button>
      </div>
    )
  }

  return <ImageListView images={images} />
}

export default ImageListContainer
