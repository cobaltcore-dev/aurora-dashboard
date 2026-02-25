import { ContentHeading, Stack } from "@cloudoperators/juno-ui-components"

interface ProjectInfoBoxProps {
  pageTitle: string
  projectInfo: {
    id: string
    name: string
    description?: string
    domain?: {
      name?: string
    }
  }
}

export function ProjectInfoBox({ projectInfo, pageTitle }: ProjectInfoBoxProps) {
  return (
    <Stack direction="horizontal" alignment="stretch" className="my-6">
      <ContentHeading className="text-2xl font-semibold">{pageTitle}</ContentHeading>

      <Stack direction="vertical" className="ml-auto">
        <div>
          <p className="text-theme-light truncate">
            <span className="text-theme-light font-semibold">Project ID: </span>
            {projectInfo.id}
          </p>
        </div>
        <div>
          <p className="text-theme-light truncate">
            <span className="font-semibold">Project Name: </span>
            {projectInfo.name}
          </p>
        </div>

        {projectInfo.domain?.name && (
          <div>
            <p className="text-theme-light truncate">
              <span className="text-theme-light font-semibold">Domain Name: </span>
              {projectInfo.domain?.name}
            </p>
          </div>
        )}
      </Stack>
    </Stack>
  )
}
