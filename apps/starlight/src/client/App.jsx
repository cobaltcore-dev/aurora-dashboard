import { useState } from "react"
import reactLogo from "./assets/react.svg"
import viteLogo from "/vite.svg"
import "./App.css"
import client from "./trpcClient"

function App() {
  const [count, setCount] = useState(0)
  client.identity.users.list.query().then((res) => {
    console.log("=================Identity users", res)
  })
  client.compute.servers.list.query().then((res) => {
    console.log("=================Compute Servers", res)
  })

  client.identity.projects.list.query().then((res) => {
    console.log("=================Identity Projects", res)
  })

  // client.extensionA.query({ name: "world" }).then((res) => {
  //   console.log("=================Extension A", res)
  // })

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </>
  )
}

export default App
