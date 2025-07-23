import { EventEmitter } from "events"

export type UpdateType = "progress" | "projects" | "images" | "compute" | "authentication" | "gardener"

class UpdateService {
  private emitter = new EventEmitter()

  notify(type: UpdateType) {
    console.log(`Update triggered: ${type}`)
    this.emitter.emit("update", type)
  }

  subscribe(callback: (type: UpdateType) => void) {
    this.emitter.on("update", callback)
    return () => this.emitter.off("update", callback)
  }
}

export const updateService = new UpdateService()
