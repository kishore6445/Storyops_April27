"use client"

import { useState, useEffect } from "react"
import { Loader, ChevronRight } from "lucide-react"
import useSWR from "swr"
import { useRouter } from "next/navigation"

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const response = await fetch(url, {
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error("Failed to fetch")
  return response.json()
}

interface ClientPhase {
  id: string
  name: string
  description?: string
}

interface Client {
  id: string
  name: string
  phases?: ClientPhase[]
}

export default function WBSPage() {
  const router = useRouter()
  const { data, isLoading } = useSWR("/api/clients", fetcher)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showPhaseSelector, setShowPhaseSelector] = useState(false)

  useEffect(() => {
    if (data?.clients) {
      setClients(data.clients)
    }
  }, [data])

  const handleSelectProject = (client: Client) => {
    setSelectedClient(client)
    setShowPhaseSelector(true)
  }

  const handleStartWBS = (phase: ClientPhase) => {
    router.push(`/wbs/project/${selectedClient?.id}/${phase.id}`)
    setShowPhaseSelector(false)
  }

  if (showPhaseSelector && selectedClient) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => setShowPhaseSelector(false)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2"
              >
                ← Back
              </button>
              <h1 className="text-3xl font-light text-gray-900">Select Project Phase</h1>
              <p className="text-sm text-gray-500 mt-1">Choose a phase for {selectedClient.name}</p>
            </div>
          </div>
        </div>

        {/* Phase List */}
        <div className="p-8">
          {!selectedClient.phases || selectedClient.phases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No phases available for this client.</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-2xl">
              {selectedClient.phases.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => handleStartWBS(phase)}
                  className="w-full text-left p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
                      {phase.description && (
                        <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900">Work Breakdown Structure</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage project WBS</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No clients available. Create a client first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => handleSelectProject(client)}
                className="text-left p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                    <p className="text-xs text-gray-500 mt-2">
                      {client.phases?.length || 0} phase{client.phases?.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
