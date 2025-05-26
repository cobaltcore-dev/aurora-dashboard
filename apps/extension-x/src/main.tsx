import { registerClient } from "./client/index.js"

const container = document.getElementById("app")!
const { mount } = registerClient({
  mountRoute: "",
})
mount(container, { baseUrl: "", bffPath: "_bff" })
