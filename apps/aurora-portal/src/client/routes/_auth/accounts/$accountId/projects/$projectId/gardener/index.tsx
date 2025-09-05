import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_auth/accounts/$accountId/projects/$projectId/gardener/")({
  component: Gardener,
})

import { Server, Shield, Globe, Database, Activity, BarChart, RefreshCw } from "lucide-react"

function Gardener() {
  // Function to smoothly scroll to features section
  const scrollToFeatures = (e: { preventDefault: () => void }) => {
    e.preventDefault()
    const featuresSection = document.getElementById("features")
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-aurora-gray-950 to-aurora-gray-900 text-aurora-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="pt-16 pb-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <svg
                className="h-8 w-8 text-aurora-blue-500"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 6V12L16 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 14C8 14 10 16 12 16C14 16 16 14 16 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 10C8 10 10 8 12 8C14 8 16 10 16 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h1 className="text-3xl font-bold tracking-tight text-aurora-white">Gardener</h1>
            </div>
            <div className="hidden md:flex space-x-6 text-sm font-medium">
              <a href="#features" className="text-aurora-gray-300 hover:text-aurora-white transition">
                Features
              </a>
              <a href="#benefits" className="text-aurora-gray-300 hover:text-aurora-white transition">
                Benefits
              </a>
              <a href="#support" className="text-aurora-gray-300 hover:text-aurora-white transition">
                Support
              </a>
            </div>
          </div>
        </header>

        <main>
          {/* Hero Content */}
          <div className="flex flex-col md:flex-row items-center mb-16">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <h2 className="text-4xl md:text-5xl font-bold leading-tight text-aurora-white mb-6">
                Kubernetes Clusters <span className="text-aurora-blue-500">Automated</span>
              </h2>
              <p className="text-xl text-aurora-gray-300 mb-8 max-w-lg">
                Easily create and manage Kubernetes clusters based on virtual machines with our intuitive Gardener
                platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/gardener/clusters">
                  <button className="bg-aurora-blue-700 hover:bg-aurora-blue-600 text-aurora-white px-6 py-3 rounded-lg font-medium transition duration-200 flex items-center justify-center border border-aurora-blue-600 shadow-lg shadow-aurora-blue-900/20">
                    <Server className="h-5 w-5 mr-2" />
                    Manage Clusters
                  </button>
                </a>
                <button
                  onClick={scrollToFeatures}
                  className="bg-transparent border border-aurora-blue-600 text-aurora-blue-400 hover:bg-aurora-blue-900 hover:bg-opacity-20 px-6 py-3 rounded-lg font-medium transition duration-200"
                >
                  Learn More
                </button>
              </div>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="absolute inset-0 bg-aurora-blue-800 bg-opacity-20 rounded-lg filter blur-xl"></div>
                <div className="relative bg-aurora-gray-900 p-6 rounded-lg border border-aurora-gray-800 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full bg-aurora-red-500"></div>
                      <div className="h-3 w-3 rounded-full bg-aurora-yellow-500"></div>
                      <div className="h-3 w-3 rounded-full bg-aurora-blue-500"></div>
                    </div>
                    <div className="text-xs text-aurora-gray-400">gardener-terminal</div>
                  </div>
                  <div className="font-mono text-sm">
                    <p className="text-aurora-blue-500 mb-1">$ kubectl get clusters</p>
                    <p className="text-aurora-gray-300 mb-1">NAME STATUS REGION VERSION</p>
                    <p className="text-aurora-gray-300 mb-1">prod-cluster Running us-east-1 v1.25.4</p>
                    <p className="text-aurora-gray-300 mb-1">stage-cluster Running eu-west-2 v1.24.8</p>
                    <p className="text-aurora-gray-300 mb-1">dev-cluster Running ap-south-1 v1.26.0</p>
                    <p className="text-aurora-blue-500 mt-3 mb-1">
                      $ gardener create cluster --name=test --region=eu-central-1
                    </p>
                    <p className="text-aurora-gray-300 mb-1">cluster.gardener.cloud/test created</p>
                    <p className="text-aurora-gray-400 mt-3 flex items-center">
                      <span className="animate-pulse mr-1">▋</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <section id="features" className="py-12 border-t border-aurora-gray-800">
            <h2 className="text-3xl font-bold mb-12 text-center">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-aurora-gray-900 bg-opacity-60 p-6 rounded-lg border border-aurora-gray-800 hover:border-aurora-blue-600 transition duration-300 shadow-lg">
                <div className="mb-4">
                  <Server className="h-6 w-6 text-aurora-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">VM-Based Kubernetes</h3>
                <p className="text-aurora-gray-400">
                  Automate creation of Kubernetes clusters using virtual machines for enhanced stability and
                  performance.
                </p>
              </div>

              <div className="bg-aurora-gray-900 bg-opacity-60 p-6 rounded-lg border border-aurora-gray-800 hover:border-aurora-blue-600 transition duration-300 shadow-lg">
                <div className="mb-4">
                  <Shield className="h-6 w-6 text-aurora-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Secure by Default</h3>
                <p className="text-aurora-gray-400">
                  Built-in security with role-based access control and encrypted communication between all components.
                </p>
              </div>

              <div className="bg-aurora-gray-900 bg-opacity-60 p-6 rounded-lg border border-aurora-gray-800 hover:border-aurora-blue-600 transition duration-300 shadow-lg">
                <div className="mb-4">
                  <Globe className="h-6 w-6 text-aurora-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Multi-Cloud Support</h3>
                <p className="text-aurora-gray-400">
                  Deploy clusters on AWS, Azure, GCP, and other cloud providers with consistent management experience.
                </p>
              </div>

              <div className="bg-aurora-gray-900 bg-opacity-60 p-6 rounded-lg border border-aurora-gray-800 hover:border-aurora-blue-600 transition duration-300 shadow-lg">
                <div className="mb-4">
                  <Database className="h-6 w-6 text-aurora-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Simplified Storage</h3>
                <p className="text-aurora-gray-400">
                  Automated storage provisioning to support stateful applications in your Kubernetes environment.
                </p>
              </div>

              <div className="bg-aurora-gray-900 bg-opacity-60 p-6 rounded-lg border border-aurora-gray-800 hover:border-aurora-blue-600 transition duration-300 shadow-lg">
                <div className="mb-4">
                  <Activity className="h-6 w-6 text-aurora-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Health Monitoring</h3>
                <p className="text-aurora-gray-400">
                  Built-in monitoring for both the Kubernetes clusters and the underlying virtual machine
                  infrastructure.
                </p>
              </div>

              <div className="bg-aurora-gray-900 bg-opacity-60 p-6 rounded-lg border border-aurora-gray-800 hover:border-aurora-blue-600 transition duration-300 shadow-lg">
                <div className="mb-4">
                  <BarChart className="h-6 w-6 text-aurora-blue-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Resource Efficiency</h3>
                <p className="text-aurora-gray-400">
                  Optimize resource allocation across your Kubernetes clusters to reduce infrastructure costs.
                </p>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section id="benefits" className="py-16 border-t border-aurora-gray-800">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-10 md:mb-0 md:pr-12">
                <h2 className="text-3xl font-bold mb-6">Why Choose Gardener?</h2>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-aurora-blue-950 flex items-center justify-center mr-3 mt-0.5 border border-aurora-blue-700 shadow-md">
                      <svg
                        className="h-4 w-4 text-aurora-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-aurora-gray-300">Reduce cluster creation time from days to minutes</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-aurora-blue-950 flex items-center justify-center mr-3 mt-0.5 border border-aurora-blue-700 shadow-md">
                      <svg
                        className="h-4 w-4 text-aurora-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-aurora-gray-300">
                      Consistent Kubernetes experience across any infrastructure
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-aurora-blue-950 flex items-center justify-center mr-3 mt-0.5 border border-aurora-blue-700 shadow-md">
                      <svg
                        className="h-4 w-4 text-aurora-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-aurora-gray-300">Lower management overhead with automated operations</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-aurora-blue-950 flex items-center justify-center mr-3 mt-0.5 border border-aurora-blue-700 shadow-md">
                      <svg
                        className="h-4 w-4 text-aurora-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-aurora-gray-300">Improve reliability with proven VM-based architecture</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-aurora-blue-950 flex items-center justify-center mr-3 mt-0.5 border border-aurora-blue-700 shadow-md">
                      <svg
                        className="h-4 w-4 text-aurora-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-aurora-gray-300">Simplify multi-cloud and hybrid deployments</span>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 rounded-full bg-aurora-blue-950 flex items-center justify-center mr-3 mt-0.5 border border-aurora-blue-700 shadow-md">
                      <svg
                        className="h-4 w-4 text-aurora-blue-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-aurora-gray-300">
                      Enterprise-ready with full support for production workloads
                    </span>
                  </li>
                </ul>
                <div className="mt-8">
                  <a href="/gardener/clusters">
                    <button className="bg-aurora-blue-700 hover:bg-aurora-blue-600 text-aurora-white px-6 py-3 rounded-lg font-medium transition duration-200 border border-aurora-blue-600 shadow-lg shadow-aurora-blue-900/20">
                      Get Started Today
                    </button>
                  </a>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="bg-aurora-gray-900 rounded-lg p-6 border border-aurora-gray-800 shadow-xl">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold">Cluster Overview</h3>
                    <div className="flex items-center text-sm text-aurora-gray-400">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      <span>Updated 5m ago</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-aurora-gray-400">Cluster Health</span>
                        <span className="text-sm text-aurora-gray-400">92%</span>
                      </div>
                      <div className="w-full bg-aurora-gray-800 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full bg-aurora-blue-500" style={{ width: "92%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-aurora-gray-400">Node Utilization</span>
                        <span className="text-sm text-aurora-gray-400">65%</span>
                      </div>
                      <div className="w-full bg-aurora-gray-800 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full bg-aurora-blue-500" style={{ width: "65%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-aurora-gray-400">Storage Usage</span>
                        <span className="text-sm text-aurora-gray-400">48%</span>
                      </div>
                      <div className="w-full bg-aurora-gray-800 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full bg-aurora-blue-500" style={{ width: "48%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-aurora-gray-400">Network Throughput</span>
                        <span className="text-sm text-aurora-gray-400">37%</span>
                      </div>
                      <div className="w-full bg-aurora-gray-800 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full bg-aurora-blue-500" style={{ width: "37%" }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-aurora-gray-800 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-aurora-gray-400 text-sm">Active Clusters</p>
                      <p className="text-2xl font-bold">12</p>
                    </div>
                    <div>
                      <p className="text-aurora-gray-400 text-sm">Total VMs</p>
                      <p className="text-2xl font-bold">48</p>
                    </div>
                    <div>
                      <p className="text-aurora-gray-400 text-sm">Kubernetes Versions</p>
                      <p className="text-2xl font-bold">4</p>
                    </div>
                    <div>
                      <p className="text-aurora-gray-400 text-sm">Cloud Providers</p>
                      <p className="text-2xl font-bold">3</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Simple Logo Section at Bottom */}
          <div className="flex justify-center py-12 border-t border-aurora-gray-800">
            <div className="flex items-center space-x-2">
              <svg
                className="h-8 w-8 text-aurora-blue-500"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 6V12L16 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 14C8 14 10 16 12 16C14 16 16 14 16 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 10C8 10 10 8 12 8C14 8 16 10 16 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h2 className="text-2xl font-bold tracking-tight text-aurora-white">Gardener</h2>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
