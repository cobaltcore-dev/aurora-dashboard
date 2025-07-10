import { protectedProcedure } from "../../trpc"

export const progressRouter = {
  subscribe: protectedProcedure.subscription(async function* () {
    let progress = 0

    while (progress < 100) {
      // Simulate some work/delay
      await new Promise((resolve) => setTimeout(resolve, 200))
      progress += Math.random() * 15
      if (progress > 100) progress = 100

      // Yield the current progress
      yield {
        progress: Math.round(progress),
      }
    }

    // Final yield to ensure we hit exactly 100%
    yield {
      progress: 100,
    }
  }),
}
