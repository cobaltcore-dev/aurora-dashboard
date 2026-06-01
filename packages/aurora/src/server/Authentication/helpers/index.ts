/**
 * Creates an indexed lookup object from a list of services, organized by service type.
 *
 * @param availableServices - Array of service objects containing name and type properties
 * @returns A nested object where the first level keys are service types, and second level
 *          keys are service names with boolean values set to `true`. This structure enables
 *          O(1) lookup to check if a specific service exists for a given type.
 */
export const getServiceIndex = (
  availableServices: {
    name: string
    type: string
  }[]
) =>
  availableServices.reduce(
    (acc, service) => {
      if (!acc[service.type]) {
        acc[service.type] = {}
      }
      acc[service.type][service.name] = true
      return acc
    },
    {} as Record<string, Record<string, boolean>>
  )
