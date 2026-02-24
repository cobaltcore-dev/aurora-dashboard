import React, { ReactNode } from "react"
import { Box, Stack, DataGrid } from "@cloudoperators/juno-ui-components"

interface SectionProps {
  title: ReactNode
  rows: ReactNode[]
  className?: string
}

const Section: React.FC<SectionProps> = ({ title, rows, className = "" }) => {
  const displayedTitle =
    typeof title === "string" ? (
      <h3 className="text-theme-highest text-xl leading-none font-semibold tracking-tight">{title}</h3>
    ) : (
      title
    )

  return (
    <Stack direction="vertical" gap="3" className={className}>
      {displayedTitle}
      <Box>
        <DataGrid columns={2} style={{ gridTemplateColumns: "30% 70%" }}>
          {rows.map((row, index) => (
            <React.Fragment key={index}>{row}</React.Fragment>
          ))}
        </DataGrid>
      </Box>
    </Stack>
  )
}

export default Section
