/* eslint-disable @typescript-eslint/no-unused-vars */
import * as d3 from "d3"

export interface TopologyNode {
  name: string
  type: string
  id: string
  children?: TopologyNode[]
}

export interface DrawSvgOptions {
  width: number
  height: number
}

export function drawSvg(containerElement: HTMLDivElement, data: TopologyNode, DrawSvgOptions): void
