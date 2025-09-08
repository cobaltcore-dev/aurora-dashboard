import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * A utility function that combines clsx and tailwind-merge
 *
 * This function takes multiple class values (strings, objects, arrays, etc.)
 * and combines them into a single string of CSS classes.
 * It then uses tailwind-merge to resolve any Tailwind CSS conflicts.
 *
 * @param inputs - Class values to be combined
 * @returns A string of CSS classes with Tailwind conflicts resolved
 *
 * @example
 * // Basic usage
 * cn('text-red-500', 'bg-blue-500')
 * // => 'text-red-500 bg-blue-500'
 *
 * @example
 * // With conditionals
 * cn('text-white', isError && 'bg-red-500', !isError && 'bg-blue-500')
 * // => 'text-white bg-red-500' or 'text-white bg-blue-500'
 *
 * @example
 * // Resolving conflicts
 * cn('text-red-500', 'text-blue-500')
 * // => 'text-blue-500' (the latter class wins)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
