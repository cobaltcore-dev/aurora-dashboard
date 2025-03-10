import { useEffect, useState, useRef } from "react"
import { TrpcClient } from "../trpcClient"
import { useParams } from "wouter"
import { Project } from "../../server/Project/types/models"
import { useAuroraContext } from "../Shell/AuroraProvider"
import { TopologyChart } from "./components/TopologyChart"

type GetProjectByIdState = {
  data?: Project
  error?: string
  isProjectLoading?: boolean
}

export function NetworkOverview({ client }: { client: TrpcClient }) {
  const [getProjectById, updateProjectById] = useState<GetProjectByIdState>({
    isProjectLoading: true,
  })
  const { setCurrentProject } = useAuroraContext()
  const params = useParams()

  // **Ref for container and state for dimensions**
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })

  useEffect(() => {
    client.project.getProjectById
      .query({ id: params?.projectId || "" })
      .then((data) => {
        setCurrentProject(data)
        updateProjectById({ data, isProjectLoading: false })
      })
      .catch((error) => updateProjectById({ error: error.message, isProjectLoading: false }))
  }, [])

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth
        const containerHeight = containerRef.current.clientHeight

        setDimensions({
          width: Math.min(containerWidth * 0.9, 1200), // 90% of container, max 1200px
          height: containerHeight,
        })
      }
    }

    window.addEventListener("resize", updateSize)
    updateSize() // Initial update

    return () => window.removeEventListener("resize", updateSize)
  }, [])
  if (getProjectById.isProjectLoading)
    return <div className="h-full flex justify-center items-center text-gray-400">Loading...</div>

  if (getProjectById.error)
    return <div className="h-full flex justify-center items-center text-red-500">Error: {getProjectById.error}</div>

  return (
    <div
      ref={containerRef}
      className="container max-w-screen-3xl  max-h-screen-3xl mx-auto px-6 py-4 grid grid-cols-12 gap-4"
    >
      {/* Row 1: Title & Navigation */}
      <div className="col-span-2 flex flex-col justify-center">
        <h3 className="text-3xl font-medium text-juno-grey-light-1 text-justify pl-5">Network</h3>
      </div>

      {/* Row 2: Sidebar & Main Content */}
      <div className="col-span-12 flex flex-col gap-4">
        <div className="w-full">
          {/* Pass dynamically calculated width & height */}
          <TopologyChart width={dimensions.width} height={dimensions.height} />
        </div>
      </div>
    </div>
  )
}
