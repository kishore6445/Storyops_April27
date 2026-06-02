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

interface Client {
  id: string
  name: string
  description?: string
}

export default function WBSPage() {
  const router = useRouter()
  const { data, isLoading } = useSWR("/api/clients", fetcher)
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    if (data?.clients) {
      setClients(data.clients)
    }
  }, [data])

  const handleSelectClient = (clientId: string) => {
    router.push(`/wbs/${clientId}`)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900">Work Breakdown Structure</h1>
            <p className="text-sm text-gray-500 mt-1">Create and manage client project WBS</p>
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
                onClick={() => handleSelectClient(client.id)}
                className="text-left p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                    {client.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{client.description}</p>
                    )}
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
