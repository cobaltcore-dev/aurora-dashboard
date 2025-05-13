import * as React from "react"
import { DialogBackdrop, Dialog as HeadlessDialog } from "@headlessui/react"
import { Description, DialogPanel, DialogTitle as HeadlessDialogTitle } from "@headlessui/react"

import { cn } from "@/client/utils/cn"

const Dialog = ({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) => {
  return (
    <HeadlessDialog
      open={open}
      data-testid="dialog"
      onClose={() => onOpenChange?.(false)}
      className="fixed inset-0 flex text-gray-200
       w-screen items-center justify-center p-4 transition duration-300 ease-out data-closed:opacity-0"
    >
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <DialogBackdrop className="fixed inset-0 bg-theme-modal-backdrop backdrop-blur-xl backdrop-brightness-100" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        {/* The actual dialog panel  */}

        <DialogPanel
          transition
          className="max-w-lg w-full text-center shadow-lg rounded-lg border border-juno-grey-blue-2 space-y-4
          bg-juno-grey-blue-2 bg-opacity-85 text-gray-200
         p-12 duration-300 ease-out data-closed:scale-95 data-closed:opacity-0"
        >
          {children}
        </DialogPanel>
      </div>
    </HeadlessDialog>
  )
}

const DialogContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)
const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <HeadlessDialogTitle
    data-testid="dialog-title"
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
)

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex gap-4 flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

export { Dialog, DialogContent, DialogFooter, DialogTitle, Description as DialogDescription }
