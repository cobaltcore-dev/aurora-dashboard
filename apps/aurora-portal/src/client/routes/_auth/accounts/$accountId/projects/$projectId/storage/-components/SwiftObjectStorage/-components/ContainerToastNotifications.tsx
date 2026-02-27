import { ToastProps } from "@cloudoperators/juno-ui-components"

type ToastOptions = Pick<ToastProps, "onDismiss">

export const getContainerCreatedToast = (containerName: string, options?: ToastOptions): ToastProps => ({
  title: "Container Created",
  text: `Container "${containerName}" was successfully created.`,
  variant: "success",
  autoDismiss: true,
  autoDismissTimeout: 5000,
  ...options,
})

export const getContainerCreateErrorToast = (
  containerName: string,
  errorMessage: string,
  options?: ToastOptions
): ToastProps => ({
  title: "Failed to Create Container",
  text: `Could not create container "${containerName}": ${errorMessage}`,
  variant: "error",
  autoDismiss: false,
  ...options,
})

export const getContainerEmptiedToast = (
  containerName: string,
  deletedCount: number,
  options?: ToastOptions
): ToastProps => ({
  title: "Container Emptied",
  text:
    deletedCount === 0
      ? `Container "${containerName}" was already empty.`
      : `Container "${containerName}" was successfully emptied. ${deletedCount} object${deletedCount === 1 ? "" : "s"} deleted.`,
  variant: "success",
  autoDismiss: true,
  autoDismissTimeout: 5000,
  ...options,
})

export const getContainerEmptyErrorToast = (
  containerName: string,
  errorMessage: string,
  options?: ToastOptions
): ToastProps => ({
  title: "Failed to Empty Container",
  text: `Could not empty container "${containerName}": ${errorMessage}`,
  variant: "error",
  autoDismiss: false,
  ...options,
})
