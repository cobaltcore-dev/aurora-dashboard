import { ContentHeading, Stack } from "@cloudoperators/juno-ui-components"
import { Trans } from "@lingui/react/macro"
import ClipboardText from "../ClipboardText"
import { useRouteContext } from "@tanstack/react-router"
import { useState, useEffect } from "react"

interface ProjectInfoBoxProps {
  projectInfo: {
    id: string
    name: string
    description?: string
    domain?: {
      name?: string
    }
  }
}
export function ProjectInfoBox({ projectInfo }: ProjectInfoBoxProps) {
  const { pageTitleRef } = useRouteContext({ from: "__root__" })
  const [title, setTitle] = useState(pageTitleRef.current)

  useEffect(() => {
    const handleTitleChange = (e: CustomEvent<{ title: string }>) => {
      setTitle(e.detail.title)
    }

    window.addEventListener("pageTitleChange", handleTitleChange as EventListener)
    setTitle(pageTitleRef.current)

    return () => {
      window.removeEventListener("pageTitleChange", handleTitleChange as EventListener)
    }
  }, [pageTitleRef])

  return (
    <Stack direction="horizontal" alignment="stretch" className="my-6">
      <ContentHeading className="text-theme-highest text-2xl font-bold"> {title}</ContentHeading>

      <Stack direction="vertical" className="ml-auto">
        <div>
          <p className="text-theme-light truncate">
            <span className="text-theme-light font-semibold">
              <Trans>Project ID</Trans>:{" "}
            </span>
            <ClipboardText text={projectInfo.id} truncateAt={15} />
          </p>
        </div>
        <div>
          <p className="text-theme-light truncate">
            <span className="font-semibold">
              <Trans>Project Name</Trans>:{" "}
            </span>
            {projectInfo.name}
          </p>
        </div>

        {projectInfo.domain?.name && (
          <div>
            <p className="text-theme-light truncate">
              <span className="text-theme-light font-semibold">
                <Trans>Domain Name</Trans>:{" "}
              </span>
              {projectInfo.domain?.name}
            </p>
          </div>
        )}
      </Stack>
    </Stack>
  )
}
