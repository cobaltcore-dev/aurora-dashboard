import { render } from "@testing-library/react"
import { Toaster } from "sonner"

export const renderWithSonner = (component: React.ReactNode) => {
  return render(
    <div>
      <Toaster position="top-center" />
      {component}
    </div>
  )
}
