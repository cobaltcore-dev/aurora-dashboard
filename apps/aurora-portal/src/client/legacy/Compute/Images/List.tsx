import { TrpcClient } from "../../../trpcClient"
import { ImageListView } from "./components/ImageListView"
import { Suspense, use } from "react"
import { GlanceImage } from "../../../../server/Compute/types/image"

const ImageListContainer = ({ getImagesPromise }: { getImagesPromise: Promise<GlanceImage[] | undefined> }) => {
  const images = use(getImagesPromise)
  if (!images || images.length === 0) {
    return <p className="text-gray-400">No images available.</p>
  }

  return <ImageListView images={images} />
}

interface ImagesProps {
  client: TrpcClient
  project: string
}
export const Images = ({ client, project }: ImagesProps) => {
  const getImagesPromise = client.compute.getImagesByProjectId.query({ projectId: project })

  return (
    <Suspense fallback={<div className="p-4 text-center text-gray-400">Loading images...</div>}>
      <ImageListContainer getImagesPromise={getImagesPromise} />
    </Suspense>
  )
}
