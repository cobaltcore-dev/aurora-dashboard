import { updateService } from "./UpdateService"

class BackgroundWorker {
  private progressCache = 0

  async fetchProgress(): Promise<number> {
    try {
      const response = await fetch("http://localhost:3000/state")
      const data = await response.json()
      return data.state
    } catch (error) {
      console.error("Failed to fetch progress:", error)
      return this.progressCache
    }
  }

  // Poll external APIs and notify on changes
  startProgressPolling() {
    setInterval(async () => {
      const newProgress = await this.fetchProgress()
      if (newProgress !== this.progressCache) {
        this.progressCache = newProgress
        updateService.notify("progress")
      }
    }, 2000)
  }
}

export const backgroundWorker = new BackgroundWorker()

// Start background workers
backgroundWorker.startProgressPolling()
