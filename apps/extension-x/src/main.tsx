import appInterface from "./interface"

async function main() {
  if (appInterface.registerClient) {
    const container = document.getElementById("app")!
    const { mount } = await appInterface.registerClient({
      mountRoute: "",
    })

    mount(container, {})
  }
}

main()
