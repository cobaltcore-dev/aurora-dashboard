import { useContext, useEffect } from "react"
import { BreadcrumbExtensionContext } from "@/client/context/BreadcrumbExtensionContext"
import type { BreadcrumbItem } from "@/client/hooks/useBreadcrumbs"

/**
 * Pushes breadcrumb items from an extension service (SCI) into OSS's breadcrumb bar.
 * Items are appended after the service-level crumb and cleared when the component unmounts.
 *
 * Requirements:
 * - Must be rendered inside `BreadcrumbExtensionProvider` (mounted at `$projectId.tsx`)
 * - Pass the full ordered list on every render; the hook diffs by serialised label+icon+active key
 */
export function usePushBreadcrumbs(breadcrumbs: BreadcrumbItem[]) {
  const { setBreadcrumbs } = useContext(BreadcrumbExtensionContext)
  const key = breadcrumbs.map((c) => `${c.label}:${c.icon}:${c.active}`).join(",")

  useEffect(() => {
    setBreadcrumbs(breadcrumbs)
  }, [key])

  useEffect(() => {
    return () => setBreadcrumbs([])
  }, [])
}
