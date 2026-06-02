"use client"

import { useState, useEffect } from "react"
import { Loader, ChevronRight } from "lucide-react"
import Link from "next/link"
import useSWR from "swr"

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const response = await fetch(url, {
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error("Failed to fetch")
  return response.json()
}

export default function WBSPage() {
  const { data, isLoading } = useSWR("/api/clients", fetcher)
  const [clients, setClients] = useState<any[]>([])

  useEffect(() => {
    if (data?.clients) {
      setClients(data.clients)
    }
  }, [data])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900">Work Breakdown Structure</h1>
            <p className="text-sm text-gray-500 mt-1">Organize client projects and tasks hierarchically</p>
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
            <p className="text-gray-600">No clients available. Create a client first to use WBS.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/wbs/${client.id}`}
                className="block p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                    {client.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{client.description}</p>
                    )}
                  </div>
                </div>

                {client.is_active && (
                  <div className="mb-4">
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                      Active
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Open WBS</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
