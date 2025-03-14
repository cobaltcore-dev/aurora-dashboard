import { z, ZodError } from "zod"

// Define the schema for the error object
const ErrorObjectSchema = z.object({
  message: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  faultstring: z.string().optional(),
})

// Create a function to handle parsing of the error object
export function parseErrorObject(object: unknown): string | null {
  if (!object) return null

  // If the object is a string, return it directly
  if (typeof object === "string") return object

  // If the object is an array, recursively parse each item and join the results
  if (Array.isArray(object)) {
    return object.map(parseErrorObject).filter(Boolean).join(", ")
  }

  // Ensure we assert that object is indeed a Record for TypeScript to understand its structure
  const typedObject = object as Record<string, unknown>

  // Attempt to parse and extract the error message from a structured object
  try {
    const parsed = ErrorObjectSchema.parse(typedObject) // Validate and parse the object

    // Return the first defined message in priority order
    const errorMessage = parsed.message || parsed.description || parsed.faultstring || parsed.type

    if (errorMessage) {
      return errorMessage
    }

    // If no message is found, iterate through the object keys to find additional messages
    return Object.keys(typedObject)
      .map((key) => parseErrorObject(typedObject[key])) // Accessing the key safely
      .filter(Boolean) // Filter out null results from parsing
      .join(", ")
  } catch (e) {
    if (e instanceof ZodError) {
      console.error("Invalid error object structure:", e.errors)
    }
    return null // Return null if parsing fails
  }
}
