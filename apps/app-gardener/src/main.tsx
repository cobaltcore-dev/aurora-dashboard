import extension from "./extension"

const container = document.getElementById("app")!
if (extension.registerClient) {
  extension
    .registerClient({
      mountRoute: "",
    })
    .then(({ mount }) => {
      mount(container, { bffPath: "_bff" })
    })
}
