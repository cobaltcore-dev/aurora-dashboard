import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

export const Route = createFileRoute("/test")({
  component: RouteComponent,
})

function RouteComponent() {
  const [clusterName, updateClusterName] = useState("test-cluster-10")
  const { trpcClient } = Route.useRouteContext()

  trpcClient?.gardener.getCloudProfiles.query().then((data) => {
    console.log("Cloud Profiles:", data)
  })

  const createCluster = async () => {
    await trpcClient?.gardener.createCluster
      .mutate({
        name: clusterName,
        cloudProfileName: "converged-cloud",
        credentialsBindingName: "app-cred-openstack",
        region: "eu-de-1",
        kubernetesVersion: "1.32.2",

        infrastructure: {
          // prefix FloatingIP- is default
          floatingPoolName: "FloatingIP-external-monsoon3-01",
        },

        // Networking settings
        // this will be prefield by k8s controller in future
        networking: {
          pods: "100.64.0.0/12",
          nodes: "10.180.0.0/16",
          services: "100.104.0.0/13",
        },

        // Worker configuration
        workers: [
          {
            machineType: "g_c2_m4",
            machineImage: {
              name: "gardenlinux",
              version: "1592.9.0",
            },
            minimum: 1,
            maximum: 2,
            zones: ["eu-de-1a"],
          },
        ],
      })
      .catch((err) => {
        console.error("Error creating cluster:", err)
      })
  }

  return (
    <div>
      <h1>Gardener Clusters</h1>
      <p>List of clusters managed by Gardener.</p>
      <input
        type="text"
        placeholder="Cluster Name"
        value={clusterName}
        onChange={(e) => updateClusterName(e.target.value)}
      />
      <button onClick={createCluster}>Create Cluster</button>
    </div>
  )
}
