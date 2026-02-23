import { Box, ContentHeading, Stack } from "@cloudoperators/juno-ui-components"

interface ProjectInfoBoxProps {
  projectInfo: {
    id: string
    name: string
    description?: string
  }
}

export function ProjectInfoBox({ projectInfo }: ProjectInfoBoxProps) {
  return (
    <Box className="m-0 overflow-hidden">
      <ContentHeading>Project Info</ContentHeading>

      <Stack direction="vertical" gap="2">
        <div>
          <span className="text-theme-high font-semibold">Project ID</span>
          <p className="truncate">{projectInfo.id}</p>
        </div>
        <div>
          <span className="text-theme-high font-semibold">Project Name</span>
          <p>{projectInfo.name}</p>
        </div>
        {projectInfo.description && (
          <div>
            <span className="text-theme-high font-semibold">Description</span>
            <p>{projectInfo.description}</p>
          </div>
        )}
      </Stack>
    </Box>
  )
}
