/* eslint-disable @typescript-eslint/no-unused-vars */
import * as d3 from "d3"

export interface TopologyNode {
  name: string
  type: string
  id: string
  children?: TopologyNode[]
}

export interface DrawSvgProps {
  inputRef: React.RefObject<HTMLDivElement>
  width: number
  height: number
  data: TopologyNode
}

export function drawSvg(props: DrawSvgProps): void
