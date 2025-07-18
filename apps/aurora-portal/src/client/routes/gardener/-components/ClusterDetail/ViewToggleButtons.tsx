import React from "react"
import { Button, Stack } from "@cloudoperators/juno-ui-components"
import { useLingui } from "@lingui/react/macro"

import GridIcon from "../../../../assets/grid.svg?react"
import JsonIcon from "../../../../assets/json.svg?react"

interface ViewToggleButtonsProps {
  currentView: (typeof Views)[keyof typeof Views]
  toggleView: (_view: ViewToggleButtonsProps["currentView"]) => void
}

export const Views = {
  GRID: "grid",
  JSON: "json",
} as const

const DEFAULT_SMALL_APP_MARGIN = "2"

const ViewToggleButtons: React.FC<ViewToggleButtonsProps> = ({ currentView, toggleView }) => {
  const isGridDisabled = currentView === Views.GRID
  const isJsonDisabled = currentView === Views.JSON

  const { t } = useLingui()

  return (
    <Stack direction="horizontal" gap={DEFAULT_SMALL_APP_MARGIN} className="ml-auto">
      <span className="flex items-center">View:</span>

      <Button
        onClick={() => toggleView(Views.GRID)}
        className={isGridDisabled ? "bg-theme-background-lvl-0" : ""}
        disabled={isGridDisabled}
        variant="subdued"
      >
        <GridIcon title={t`List View`} />
      </Button>

      <Button
        onClick={() => toggleView(Views.JSON)}
        className={isJsonDisabled ? "bg-theme-background-lvl-0" : ""}
        disabled={isJsonDisabled}
        variant="subdued"
      >
        <JsonIcon title={t`Code View`} />
      </Button>
    </Stack>
  )
}

export default ViewToggleButtons
