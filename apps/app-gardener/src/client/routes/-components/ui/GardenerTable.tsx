import * as React from "react"

import { cn } from "../../-utils/cn"

const GardenerTable = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm text-aurora-white", className)} {...props} />
    </div>
  )
)
GardenerTable.displayName = "GardenerTable"

const GardenerTableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-aurora-gray-700", className)} {...props} />
  )
)
GardenerTableHeader.displayName = "GardenerTableHeader"

const GardenerTableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  )
)
GardenerTableBody.displayName = "GardenerTableBody"

const GardenerTableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn(
        "border-t border-aurora-gray-700 bg-aurora-gray-800/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
)
GardenerTableFooter.displayName = "GardenerTableFooter"

const GardenerTableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b border-aurora-gray-700 transition-colors hover:bg-aurora-gray-800/50 data-[state=selected]:bg-aurora-gray-800",
        className
      )}
      {...props}
    />
  )
)
GardenerTableRow.displayName = "GardenerTableRow"

const GardenerTableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-aurora-gray-400 [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
)
GardenerTableHead.displayName = "GardenerTableHead"

const GardenerTableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("p-4 align-middle text-aurora-gray-300 [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  )
)
GardenerTableCell.displayName = "GardenerTableCell"

const GardenerTableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-aurora-gray-400", className)} {...props} />
  )
)
GardenerTableCaption.displayName = "GardenerTableCaption"

export {
  GardenerTable,
  GardenerTableHeader,
  GardenerTableBody,
  GardenerTableFooter,
  GardenerTableHead,
  GardenerTableRow,
  GardenerTableCell,
  GardenerTableCaption,
}
