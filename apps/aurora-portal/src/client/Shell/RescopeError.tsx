import { useRouteError, isRouteErrorResponse } from "react-router-dom"

interface ErrorResponseData {
  message: string
}

/**
 * Error component for Project-related errors
 * Displays error messages from React Router's error boundary
 */
export function RescopeError() {
  const error = useRouteError()
  let errorMessage = "An unexpected error occurred loading the project"

  // Handle route error responses
  if (isRouteErrorResponse(error)) {
    // Try to parse the error data if it's JSON
    try {
      const data = JSON.parse(error.data) as ErrorResponseData
      errorMessage = data.message || error.statusText
    } catch {
      // If parsing fails, use the status text
      errorMessage = error.statusText || errorMessage
    }
  } else if (error instanceof Error) {
    // Handle standard JS errors
    errorMessage = error.message
  } else if (typeof error === "string") {
    // Handle string errors
    errorMessage = error
  }

  return (
    <div className="h-full flex flex-col justify-center items-center p-4">
      <div className="text-red-500 text-xl font-semibold mb-2">Project Error</div>
      <div className="text-red-500">{errorMessage}</div>
      <button
        onClick={() => window.history.back()}
        className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
      >
        Go Back
      </button>
    </div>
  )
}
