/* eslint-disable @typescript-eslint/no-unused-vars */
import * as d3 from "d3"

const EDGE_COLOR = "#15d0e0"
const NAME_COLOR = "#15d0e0" // "#FFD700"

export const drawSvg = (containerElement, data, { width, height }) => {
  const marginTop = 10
  const marginRight = 20
  const marginBottom = 10
  const marginLeft = 40

  // Rows are separated by dx pixels, columns by dy pixels. These names can be counter-intuitive
  // (dx is a height, and dy a width). This because the tree must be viewed with the root at the
  // “bottom”, in the data domain. The width of a column is based on the tree’s height.
  const root = d3.hierarchy(data)
  const dx = 25
  const dy = (width - marginRight - marginLeft) / (1 + root.height)

  // Define the tree layout and the shape for links.
  const tree = d3.tree().nodeSize([dx, dy])
  const diagonal = d3
    .linkHorizontal()
    .x((d) => d.y)
    .y((d) => d.x)
  const container = d3.select(containerElement)

  // Create the SVG container, a layer for the links and a layer for the nodes.
  const svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", dx)
    .attr("viewBox", [-marginLeft, -marginTop, width, dx])
    .attr("style", "max-width: 100%; height: auto; font: 12px sans-serif; user-select: none;")

  const gLink = svg
    .append("g")
    .attr("fill", "none")
    .attr("stroke", EDGE_COLOR)
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)

  const gNode = svg.append("g").attr("cursor", "pointer").attr("pointer-events", "all")

  function update(event, source) {
    const duration = event?.altKey ? 2500 : 250 // hold the alt key to slow down the transition
    const nodes = root.descendants().reverse()
    const links = root.links()

    // Compute the new tree layout.
    tree(root)

    let left = root
    let right = root
    root.eachBefore((node) => {
      if (node.x < left.x) left = node
      if (node.x > right.x) right = node
    })

    const height = right.x - left.x + marginTop + marginBottom

    const transition = svg
      .transition()
      .duration(duration)
      .attr("height", height)
      .attr("viewBox", [-marginLeft, left.x - marginTop, width, height])
      // eslint-disable-next-line no-undef
      .tween("resize", window.ResizeObserver ? null : () => () => svg.dispatch("toggle"))

    // Update the nodes…
    const node = gNode.selectAll("g").data(nodes, (d) => d.id)

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = node
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${source.y0},${source.x0})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (event, d) => {
        d.children = d.children ? null : d._children
        update(event, d)
      })

    nodeEnter
      .append("svg:image")
      .attr(
        "xlink:href",
        (d) =>
          "data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjZmZmIiBoZWlnaHQ9IjIwMHB4IiB3aWR0aD0iMjAwcHgiIHZlcnNpb249IjEuMSIgaWQ9IkNhcGFfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgNDg4IDQ4OCIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CiAgPGcgaWQ9IlNWR1JlcG9fYmdDYXJyaWVyIiBzdHJva2Utd2lkdGg9IjAiPjwvZz4KICA8ZyBpZD0iU1ZHUmVwb190cmFjZXJDYXJyaWVyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjwvZz4KICA8ZyBpZD0iU1ZHUmVwb19pY29uQ2FycmllciI+CiAgICA8Zz4KICAgICAgPGc+CiAgICAgICAgPHBhdGgKICAgICAgICAgIGQ9Ik0zMDUuNCwyNDRjMC0zMy45LTI3LjYtNjEuNC02MS40LTYxLjRzLTYxLjQsMjcuNS02MS40LDYxLjRzMjcuNiw2MS40LDYxLjQsNjEuNFMzMDUuNCwyNzcuOSwzMDUuNCwyNDR6IE0yNDQsMjgxLjQgYy0yMC42LDAtMzcuNC0xNi44LTM3LjQtMzcuNHMxNi44LTM3LjQsMzcuNC0zNy40czM3LjQsMTYuOCwzNy40LDM3LjRTMjY0LjYsMjgxLjQsMjQ0LDI4MS40eiI+CiAgICAgICAgPC9wYXRoPgogICAgICAgIDxwYXRoIGQ9Ik0xNTUuMSwyMzJjLTYuNiwwLTEyLDUuNC0xMiwxMnM1LjQsMTIsMTIsMTJzMTItNS40LDEyLTEyUzE2MS43LDIzMiwxNTUuMSwyMzJ6Ij48L3BhdGg+CiAgICAgICAgPHBhdGggZD0iTTEwMy44LDI0NGMwLDYuNiw1LjQsMTIsMTIsMTJjNi42LDAsMTItNS40LDEyLTEycy01LjQtMTItMTItMTJTMTAzLjgsMjM3LjQsMTAzLjgsMjQ0eiI+PC9wYXRoPgogICAgICAgIDxwYXRoCiAgICAgICAgICBkPSJNODguNSwyNDRjMC0yNC40LTE5LjktNDQuMy00NC4zLTQ0LjNTMCwyMTkuNiwwLDI0NHMxOS45LDQ0LjMsNDQuMyw0NC4zUzg4LjUsMjY4LjQsODguNSwyNDR6IE00NC4zLDI2NC4zIGMtMTEuMiwwLTIwLjMtOS4xLTIwLjMtMjAuM3M5LjEtMjAuMywyMC4zLTIwLjNzMjAuMyw5LjEsMjAuMywyMC4zUzU1LjQsMjY0LjMsNDQuMywyNjQuM3oiPgogICAgICAgIDwvcGF0aD4KICAgICAgICA8Y2lyY2xlIGN4PSIzNzIuMiIgY3k9IjI0NCIgcj0iMTIiPjwvY2lyY2xlPgogICAgICAgIDxwYXRoIGQ9Ik0zMzIuOSwyNTZjNi42LDAsMTItNS40LDEyLTEycy01LjQtMTItMTItMTJzLTEyLDUuNC0xMiwxMlMzMjYuMywyNTYsMzMyLjksMjU2eiI+PC9wYXRoPgogICAgICAgIDxwYXRoCiAgICAgICAgICBkPSJNNDQzLjcsMTk5LjdjLTI0LjQsMC00NC4zLDE5LjktNDQuMyw0NC4zczE5LjksNDQuMyw0NC4zLDQ0LjNTNDg4LDI2OC40LDQ4OCwyNDRTNDY4LjEsMTk5LjcsNDQzLjcsMTk5Ljd6IE00NDMuNywyNjQuMyBjLTExLjIsMC0yMC4zLTkuMS0yMC4zLTIwLjNzOS4xLTIwLjMsMjAuMy0yMC4zUzQ2NCwyMzIuOCw0NjQsMjQ0QzQ2NCwyNTUuMiw0NTQuOSwyNjQuMyw0NDMuNywyNjQuM3oiPgogICAgICAgIDwvcGF0aD4KICAgICAgICA8cGF0aCBkPSJNMjQ0LDMyMC45Yy02LjYsMC0xMiw1LjQtMTIsMTJzNS40LDEyLDEyLDEyczEyLTUuNCwxMi0xMlMyNTAuNiwzMjAuOSwyNDQsMzIwLjl6Ij48L3BhdGg+CiAgICAgICAgPHBhdGggZD0iTTI0NCwzNjAuMmMtNi42LDAtMTIsNS40LTEyLDEyczUuNCwxMiwxMiwxMnMxMi01LjQsMTItMTJTMjUwLjYsMzYwLjIsMjQ0LDM2MC4yeiI+PC9wYXRoPgogICAgICAgIDxwYXRoCiAgICAgICAgICBkPSJNMjQ0LDM5OS41Yy0yNC40LDAtNDQuMywxOS45LTQ0LjMsNDQuM1MyMTkuNiw0ODgsMjQ0LDQ4OHM0NC4zLTE5LjksNDQuMy00NC4zUzI2OC40LDM5OS41LDI0NCwzOTkuNXogTTI0NCw0NjQgYy0xMS4yLDAtMjAuMy05LjEtMjAuMy0yMC4zczkuMS0yMC4zLDIwLjMtMjAuM2MxMS4yLDAsMjAuMyw5LjEsMjAuMywyMC4zUzI1NS4yLDQ2NCwyNDQsNDY0eiI+CiAgICAgICAgPC9wYXRoPgogICAgICAgIDxwYXRoIGQ9Ik0yNDQsMTY3LjFjNi42LDAsMTItNS40LDEyLTEycy01LjQtMTItMTItMTJzLTEyLDUuNC0xMiwxMkMyMzIsMTYxLjcsMjM3LjQsMTY3LjEsMjQ0LDE2Ny4xeiI+PC9wYXRoPgogICAgICAgIDxjaXJjbGUgY3g9IjI0NCIgY3k9IjExNS44IiByPSIxMiI+PC9jaXJjbGU+CiAgICAgICAgPHBhdGgKICAgICAgICAgIGQ9Ik0yNDQsODguNWMyNC40LDAsNDQuMy0xOS45LDQ0LjMtNDQuM1MyNjguNCwwLDI0NCwwcy00NC4zLDE5LjktNDQuMyw0NC4zUzIxOS42LDg4LjUsMjQ0LDg4LjV6IE0yNDQsMjQgYzExLjIsMCwyMC4zLDkuMSwyMC4zLDIwLjNzLTkuMSwyMC4zLTIwLjMsMjAuM3MtMjAuMy05LjEtMjAuMy0yMC4zUzIzMi44LDI0LDI0NCwyNHoiPgogICAgICAgIDwvcGF0aD4KICAgICAgICA8cGF0aCBkPSJNMTcyLjcsMjk4LjRjLTQuNyw0LjctNC43LDEyLjMsMCwxN3MxMi4zLDQuNywxNywwczQuNy0xMi4zLDAtMTdDMTg0LjksMjkzLjcsMTc3LjMsMjkzLjcsMTcyLjcsMjk4LjR6Ij4KICAgICAgICA8L3BhdGg+CiAgICAgICAgPGNpcmNsZSBjeD0iMTUzLjQiIGN5PSIzMzQuNiIgcj0iMTIiPjwvY2lyY2xlPgogICAgICAgIDxwYXRoCiAgICAgICAgICBkPSJNNzEuNSwzNTMuOWMtMTcuMywxNy4zLTE3LjMsNDUuMywwLDYyLjZzNDUuMywxNy4zLDYyLjYsMHMxNy4zLTQ1LjMsMC02Mi42QzExNi44LDMzNi43LDg4LjcsMzM2LjcsNzEuNSwzNTMuOXogTTExNy4xLDM5OS42Yy03LjksNy45LTIwLjcsNy45LTI4LjYsMHMtNy45LTIwLjcsMC0yOC42czIwLjctNy45LDI4LjYsMEMxMjUsMzc4LjgsMTI1LDM5MS43LDExNy4xLDM5OS42eiI+CiAgICAgICAgPC9wYXRoPgogICAgICAgIDxjaXJjbGUgY3g9IjMzNC42IiBjeT0iMTUzLjQiIHI9IjEyIj48L2NpcmNsZT4KICAgICAgICA8Y2lyY2xlIGN4PSIzMDYuOSIgY3k9IjE4MS4xIiByPSIxMiI+PC9jaXJjbGU+CiAgICAgICAgPHBhdGgKICAgICAgICAgIGQ9Ik00MTYuNSwxMzQuMWMxNy4zLTE3LjMsMTcuMy00NS4zLDAtNjIuNnMtNDUuMy0xNy4zLTYyLjYsMHMtMTcuMyw0NS4zLDAsNjIuNlMzOTkuMywxNTEuMyw0MTYuNSwxMzQuMXogTTM3MC45LDg4LjQgYzcuOS03LjksMjAuNy03LjksMjguNiwwczcuOSwyMC43LDAsMjguNnMtMjAuNyw3LjktMjguNiwwQzM2MywxMDkuMiwzNjMsOTYuMywzNzAuOSw4OC40eiI+CiAgICAgICAgPC9wYXRoPgogICAgICAgIDxjaXJjbGUgY3g9IjMzNC42IiBjeT0iMzM0LjYiIHI9IjEyIj48L2NpcmNsZT4KICAgICAgICA8cGF0aCBkPSJNMjk4LjQsMjk4LjRjLTQuNyw0LjctNC43LDEyLjMsMCwxN3MxMi4zLDQuNywxNywwczQuNy0xMi4zLDAtMTdDMzEwLjcsMjkzLjcsMzAzLjEsMjkzLjcsMjk4LjQsMjk4LjR6Ij4KICAgICAgICA8L3BhdGg+CiAgICAgICAgPHBhdGgKICAgICAgICAgIGQ9Ik0zNTMuOSwzNTMuOWMtMTcuMywxNy4zLTE3LjMsNDUuMywwLDYyLjZzNDUuMywxNy4zLDYyLjYsMHMxNy4zLTQ1LjMsMC02Mi42QzM5OS4zLDMzNi43LDM3MS4yLDMzNi43LDM1My45LDM1My45eiBNMzk5LjYsMzk5LjZjLTcuOSw3LjktMjAuNyw3LjktMjguNiwwcy03LjktMjAuNywwLTI4LjZzMjAuNy03LjksMjguNiwwQzQwNy41LDM3OC44LDQwNy41LDM5MS43LDM5OS42LDM5OS42eiI+CiAgICAgICAgPC9wYXRoPgogICAgICAgIDxjaXJjbGUgY3g9IjE4MS4xIiBjeT0iMTgxLjEiIHI9IjEyIj48L2NpcmNsZT4KICAgICAgICA8Y2lyY2xlIGN4PSIxNTMuNCIgY3k9IjE1My40IiByPSIxMiI+PC9jaXJjbGU+CiAgICAgICAgPHBhdGgKICAgICAgICAgIGQ9Ik0xMzQuMSwxMzQuMWMxNy4zLTE3LjMsMTcuMy00NS4zLDAtNjIuNnMtNDUuMy0xNy4zLTYyLjYsMHMtMTcuMyw0NS4zLDAsNjIuNkM4OC43LDE1MS4zLDExNi44LDE1MS4zLDEzNC4xLDEzNC4xeiBNODguNCw4OC40YzcuOS03LjksMjAuNy03LjksMjguNiwwczcuOSwyMC43LDAsMjguNnMtMjAuNyw3LjktMjguNiwwQzgwLjUsMTA5LjIsODAuNSw5Ni4zLDg4LjQsODguNHoiPgogICAgICAgIDwvcGF0aD4KICAgICAgPC9nPgogICAgPC9nPgogIDwvZz4KPC9zdmc+"
      )
      .attr("y", (d) => -12.5)
      .attr("x", (d) => (d == root ? -25 : -5))
      .attr("width", 25)
      .attr("height", 25)
    // .attr("fill-opacity", "0.5")

    nodeEnter
      .append("text")
      .attr("x", (d) => (d._children ? -50 : 25))
      .attr("dy", (d) => (d.children ? "-20px" : "5px"))
      .attr("text-align", "center")
      .text((d) => d.data.name || d.data.id)
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 0)
      .attr("stroke", "#fff")
      .attr("fill", NAME_COLOR)
      .attr("paint-order", "stroke")

    // Transition nodes to their new position.
    node
      .merge(nodeEnter)
      .transition(transition)
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1)

    // Transition exiting nodes to the parent's new position.
    node
      .exit()
      .transition(transition)
      .remove()
      .attr("transform", (d) => `translate(${source.y},${source.x})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)

    // Update the links…
    const link = gLink.selectAll("path").data(links, (d) => d.target.id)

    // Enter any new links at the parent's previous position.
    const linkEnter = link
      .enter()
      .append("path")
      .attr("d", (d) => {
        const o = { x: source.x0, y: source.y0 }
        return diagonal({ source: o, target: o })
      })

    // Transition links to their new position.
    link.merge(linkEnter).transition(transition).attr("d", diagonal)

    // Transition exiting nodes to the parent's new position.
    link
      .exit()
      .transition(transition)
      .remove()
      .attr("d", (d) => {
        const o = { x: source.x, y: source.y }
        return diagonal({ source: o, target: o })
      })

    // Stash the old positions for transition.
    root.eachBefore((d) => {
      d.x0 = d.x
      d.y0 = d.y
    })
  }

  // Do the first update to the initial configuration of the tree — where a number of nodes
  // are open (arbitrarily selected as the root, plus nodes with 7 letters).
  root.x0 = dy / 2
  root.y0 = 0
  root.descendants().forEach((d, i) => {
    d.id = i
    d._children = d.children
  })

  update(null, root)
}
