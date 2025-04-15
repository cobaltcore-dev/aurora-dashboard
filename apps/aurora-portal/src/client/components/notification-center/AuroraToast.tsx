import { toast as sonnerToast } from "sonner"
export { toast as sonnerToast } from "sonner"

/** I recommend abstracting the toast function
 *  so that you can call it without having to use toast.custom everytime. */
export function auroraToast(toast: Omit<ToastProps, "id">) {
  return sonnerToast.custom((id) => (
    <Toast
      id={id}
      title={toast.title}
      description={toast.description}
      variant={toast.variant}
      button={{
        label: toast.button.label,
        onClick: () => toast.button.onClick(),
      }}
    />
  ))
}

function Toast({ title, description, button, id, variant = "info" }: ToastProps) {
  const variantStyles = {
    info: "bg-juno-grey-light-1 text-juno-grey-blue-1 ring-black/5",
    success: "bg-sap-green text-sap-grey-2 ring-black/5",
    error: "bg-sap-orange-6 text-sap-grey-2 ring-black/5",
  }

  const buttonStyles = {
    info: "bg-juno-grey-blue-10 juno-button-default-size text-juno-grey-light-1",
    success: "bg-juno-grey-light-1 juno-button-default-size text-juno-grey-blue-1",
    error: "bg-juno-grey-light-1 juno-button-default-size text-juno-grey-blue-1",
  }

  return (
    <div
      className={`flex rounded-lg shadow-lg ring-1 w-full md:max-w-[364px]  items-center p-4 ${variantStyles[variant]}`}
    >
      <div className="flex flex-1 items-center">
        <div className="w-full">
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-sm">{description}</p>
        </div>
      </div>
      <div className="ml-5 shrink-0">
        <button
          className={`rounded px-3 py-1 text-sm font-semibold focus:ring-2 focus:ring-offset-2 ${buttonStyles[variant]}`}
          onClick={() => {
            button.onClick()
            sonnerToast.dismiss(id)
          }}
        >
          {button.label}
        </button>
      </div>
    </div>
  )
}

export interface ToastProps {
  id: string | number
  title: string
  description: string
  button: {
    label: string
    onClick: () => void
  }
  variant: "info" | "error" | "success"
}
