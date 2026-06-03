"use client"

import { useState } from "react"
import { X, Send } from "lucide-react"
import useSWR from "swr"

interface Sprint {
  id: string
  name: string
  status: string
}

interface PublishToSprintProps {
  isOpen: boolean
  onClose: () => void
  nodeTitle: string
  projectId: string
  onPublish: (sprintId: string) => Promise<void>
}

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const response = await fetch(url, {
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error("Failed to fetch")
  return response.json()
}

export function PublishToSprintDialog({
  isOpen,
  onClose,
  nodeTitle,
  projectId,
  onPublish,
}: PublishToSprintProps) {
  const { data } = useSWR(isOpen ? `/api/sprints?projectId=${projectId}` : null, fetcher)
  const [selectedSprint, setSelectedSprint] = useState<string>("")
  const [isPublishing, setIsPublishing] = useState(false)

  const sprints: Sprint[] = data?.sprints || []

  const handlePublish = async () => {
    if (!selectedSprint) return

    setIsPublishing(true)
    try {
      await onPublish(selectedSprint)
      setSelectedSprint("")
      onClose()
    } finally {
      setIsPublishing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Publish to Sprint</h2>
            <p className="text-xs text-gray-500 mt-1">{nodeTitle}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {sprints.length === 0 ? (
            <p className="text-gray-600 text-center py-6">No active sprints available</p>
          ) : (
            <div className="space-y-2">
              {sprints.map((sprint) => (
                <label key={sprint.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer">
                  <input
                    type="radio"
                    name="sprint"
                    value={sprint.id}
                    checked={selectedSprint === sprint.id}
                    onChange={(e) => setSelectedSprint(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">{sprint.name}</p>
                    <p className="text-xs text-gray-500">{sprint.status}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex gap-2">
          <button
            onClick={handlePublish}
            disabled={!selectedSprint || isPublishing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg"
          >
            <Send className="w-4 h-4" />
            {isPublishing ? "Publishing..." : "Publish"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
