import { Suspense } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ImageListContainer } from "./ImageListContainer"
import { Button } from "../../../components/Button"
import { Icon } from "../../../components/Icon"
import { TrpcClient } from "../../../trpcClient"

export function ImagesPage({ client }: { client: TrpcClient }) {
  const navigate = useNavigate()
  const { project } = useParams<{ project: string }>()

  // Handle project not found
  if (!project) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>No project selected. Please select a project first.</p>
        <Button className="mt-4" onClick={() => navigate("/projects")}>
          Go to Projects
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-200">OpenStack Images</h1>
        <div className="flex space-x-4">
          <Button
            variant="primary-danger"
            className="flex items-center space-x-2"
            onClick={() => navigate(`/projects/${project}/images/refresh`)}
          >
            <Icon name="info" color="white" />
            <span>Refresh</span>
          </Button>
          <Button
            variant="success"
            className="flex items-center space-x-2"
            onClick={() => navigate(`/projects/${project}/images/upload`)}
          >
            <Icon name="info" color="white" />
            <span>Upload Image</span>
          </Button>
        </div>
      </div>

      <div className="bg-[#0d1117] rounded-lg shadow-md p-6">
        <Suspense fallback={<div className="p-4 text-center text-gray-400">Loading images...</div>}>
          <ImageListContainer client={client} projectId={project} />
        </Suspense>
      </div>
    </div>
  )
}

export default ImagesPage
