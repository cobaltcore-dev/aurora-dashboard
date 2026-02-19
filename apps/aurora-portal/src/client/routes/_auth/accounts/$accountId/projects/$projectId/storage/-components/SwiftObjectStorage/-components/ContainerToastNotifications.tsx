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
