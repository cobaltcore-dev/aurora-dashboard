import { useVirtualizer } from "@tanstack/react-virtual"
import { useAvailableViewportHeight } from "./useAvailableViewportHeight"

const ROW_HEIGHT = 48
const OVERSCAN = 10

interface UseVirtualizedTableBodyOptions {
  /** Number of rows in the list. */
  count: number
  /** Estimated row height in px. */
  rowHeight?: number
  /** Rows to render beyond the visible range. */
  overscan?: number
  /** Space the page shell keeps below the table; see useAvailableViewportHeight. */
  bottomGap?: number
}

/**
 * Everything a virtualized table body needs: a height measured from the space
 * actually left below it, and a virtualizer whose output is withheld until that
 * height is known.
 *
 * The gating is the part worth having in one place. An unsized scroll container
 * measures as tall as its content, so on the first commit the virtualizer would
 * size its range to the whole list and render every row once, before the real
 * height lands. Reading `virtualItems` / `totalSize` from here instead of from
 * the virtualizer directly makes that impossible to forget.
 *
 * Spread `ref` onto the scroll container and apply `height` to it as `height`,
 * not `max-height` — see useAvailableViewportHeight for why.
 */
export function useVirtualizedTableBody({
  count,
  rowHeight = ROW_HEIGHT,
  overscan = OVERSCAN,
  bottomGap,
}: UseVirtualizedTableBodyOptions) {
  const { ref, elementRef, height } = useAvailableViewportHeight<HTMLDivElement>(bottomGap)

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => elementRef.current,
    estimateSize: () => rowHeight,
    overscan,
  })

  const isMeasured = height !== undefined

  return {
    /** Callback ref for the scroll container. */
    ref,
    /** The same node as a ref object, for imperative reads (scrollbar width). */
    elementRef,
    /** Measured height in px, or undefined until the container has mounted. */
    height,
    /** Empty until the height is known. */
    virtualItems: isMeasured ? virtualizer.getVirtualItems() : [],
    /** Zero until the height is known. */
    totalSize: isMeasured ? virtualizer.getTotalSize() : 0,
    /** Row ref callback for dynamic measurement. */
    measureElement: virtualizer.measureElement,
  }
}
