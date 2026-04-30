/**
 * Omits a single key from an object, returning a new object without that key.
 *
 * @example
 * const obj = { a: 1, b: 2, c: 3 }
 * const result = omit(obj, 'b')
 * // result is { a: 1, c: 3 } with type { a: number, c: number }
 */
export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const result = { ...obj }
  keys.forEach((key) => delete result[key])
  return result as Omit<T, K>
}
