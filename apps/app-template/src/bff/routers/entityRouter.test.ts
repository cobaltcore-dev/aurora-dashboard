import { describe, it, expect, beforeEach } from "vitest"
import { entityRouter } from "./entityRouter"
import { router, createCallerFactory } from "./trpc"

const createCaller = createCallerFactory(router(entityRouter))
const caller = createCaller({})

describe("entityRouter", () => {
  describe("entities.get", () => {
    it("should successfully get entity by id", async () => {
      // Act
      const result = await caller.entities.get({ id: 1 })

      // Assert
      expect(result).toEqual({
        id: 1,
        name: "Mars 1",
      })
    })

    it("should return entity with different id", async () => {
      // Act
      const result = await caller.entities.get({ id: 42 })

      // Assert
      expect(result).toEqual({
        id: 42,
        name: "Mars 1",
      })
    })

    it("should handle zero id", async () => {
      // Act
      const result = await caller.entities.get({ id: 0 })

      // Assert
      expect(result).toEqual({
        id: 0,
        name: "Mars 1",
      })
    })

    it("should handle negative id", async () => {
      // Act
      const result = await caller.entities.get({ id: -1 })

      // Assert
      expect(result).toEqual({
        id: -1,
        name: "Mars 1",
      })
    })
  })

  describe("entities.list", () => {
    it("should successfully get list of entities", async () => {
      // Act
      const result = await caller.entities.list()

      // Assert
      expect(result).toEqual([
        { id: 1, name: "Mars 1" },
        { id: 2, name: "Mars 2" },
        { id: 3, name: "Mars 3" },
        { id: 4, name: "Mars 4" },
        { id: 5, name: "Mars 5" },
      ])
    })

    it("should return array with correct length", async () => {
      // Act
      const result = await caller.entities.list()

      // Assert
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(5)
    })

    it("should return entities with correct structure", async () => {
      // Act
      const result = await caller.entities.list()

      // Assert
      result.forEach((entity, index) => {
        expect(entity).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
        })
        expect(entity.id).toBe(index + 1)
        expect(entity.name).toBe(`Mars ${index + 1}`)
      })
    })

    it("should return consistent results on multiple calls", async () => {
      // Act
      const result1 = await caller.entities.list()
      const result2 = await caller.entities.list()

      // Assert
      expect(result1).toEqual(result2)
    })
  })
})
