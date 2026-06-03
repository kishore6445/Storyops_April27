"use client"

import { useState, useEffect } from "react"
import { Loader, Plus, Edit2, Trash2, Send } from "lucide-react"
import useSWR from "swr"
import { useRouter } from "next/navigation"
import { WBSNodeEditor } from "@/app/components/WBSNodeEditor"

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const response = await fetch(url, {
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error("Failed to fetch")
  return response.json()
}

interface WBSNode {
  id: string
  wbs_code: string
  title: string
  description?: string
  status: string
  priority: string
  progress_percentage: number
  parent_id: string | null
  position: number
  assigned_to?: string
  estimated_hours?: number
  due_date?: string
}

interface WBSLane {
  id: string
  name: string
  color: string
  position: number
}

interface WBSBoard {
  id: string
  name: string
  description?: string
}

export default function WBSCanvasPage({ params }: { params: { projectId: string } }) {
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR(`/api/projects/${params.projectId}/wbs`, fetcher)
  const [selectedNode, setSelectedNode] = useState<WBSNode | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [newLaneName, setNewLaneName] = useState("")
  const [addingLane, setAddingLane] = useState(false)

  const board = data?.board
  const lanes: WBSLane[] = data?.lanes || []
  const allNodes: WBSNode[] = data?.nodes || []

  const handleEditNode = (node: WBSNode) => {
    setSelectedNode(node)
    setEditorOpen(true)
  }

  const handleSaveNode = async (updates: Partial<WBSNode>) => {
    if (!selectedNode) return

    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(
        `/api/projects/${params.projectId}/wbs/${selectedNode.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(updates),
        }
      )

      if (response.ok) {
        mutate()
        setEditorOpen(false)
      }
    } catch (error) {
      console.error("[v0] Error saving node:", error)
    }
  }

  const handleDeleteNode = async () => {
    if (!selectedNode) return

    if (!confirm("Delete this node and all children?")) return

    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(
        `/api/projects/${params.projectId}/wbs/${selectedNode.id}`,
        {
          method: "DELETE",
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
        }
      )

      if (response.ok) {
        mutate()
        setEditorOpen(false)
      }
    } catch (error) {
      console.error("[v0] Error deleting node:", error)
    }
  }

  const handleAddLane = async () => {
    if (!newLaneName.trim()) return

    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(`/api/projects/${params.projectId}/wbs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: "lane",
          name: newLaneName,
        }),
      })

      if (response.ok) {
        setNewLaneName("")
        setAddingLane(false)
        mutate()
      }
    } catch (error) {
      console.error("[v0] Error adding lane:", error)
    }
  }

  const handlePublishNode = async (node: WBSNode, sprintId: string) => {
    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(
        `/api/projects/${params.projectId}/wbs/${node.id}/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ sprintId }),
        }
      )

      if (response.ok) {
        alert("Published to sprint successfully!")
        mutate()
      }
    } catch (error) {
      console.error("[v0] Error publishing:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-8 py-6 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{board?.name || "WBS Canvas"}</h1>
            {board?.description && <p className="text-sm text-gray-500 mt-1">{board.description}</p>}
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Back
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="p-8 overflow-x-auto">
        <div className="flex gap-8 min-w-full">
          {/* Existing lanes */}
          {lanes.map((lane) => (
            <div
              key={lane.id}
              className="flex-shrink-0 w-96 border-l-4 rounded-lg bg-white shadow-sm p-6"
              style={{ borderLeftColor: lane.color }}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-6">{lane.name}</h2>

              {/* Nodes in this lane */}
              <div className="space-y-3">
                {allNodes
                  .filter((n) => n.parent_id === null)
                  .map((node) => (
                    <div
                      key={node.id}
                      onClick={() => handleEditNode(node)}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-gray-600 bg-gray-200 px-2 py-1 rounded">
                              {node.wbs_code}
                            </span>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                              {node.status}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900 mt-2">{node.title}</h3>
                          {node.description && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{node.description}</p>
                          )}

                          {/* Progress bar */}
                          {node.progress_percentage > 0 && (
                            <div className="mt-2 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${node.progress_percentage}%` }}
                              />
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex gap-2 mt-2 text-xs text-gray-500">
                            {node.estimated_hours && <span>{node.estimated_hours}h</span>}
                            {node.due_date && <span>{new Date(node.due_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Add node button */}
              <button className="w-full mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 font-medium">
                <Plus className="w-4 h-4" />
                Add Node
              </button>
            </div>
          ))}

          {/* Add lane button/form */}
          {!addingLane ? (
            <div className="flex-shrink-0 w-96 p-6">
              <button
                onClick={() => setAddingLane(true)}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-green-400 hover:text-green-600 transition-colors flex flex-col items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-6 h-6" />
                <span>Add Lane</span>
              </button>
            </div>
          ) : (
            <div className="flex-shrink-0 w-96 p-6 bg-white rounded-lg border-2 border-green-400 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">New Lane</h3>
              <input
                type="text"
                placeholder="Lane name (e.g., Facebook)"
                value={newLaneName}
                onChange={(e) => setNewLaneName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddLane}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                >
                  Create
                </button>
                <button
                  onClick={() => setAddingLane(false)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Node Editor Modal */}
      <WBSNodeEditor
        node={selectedNode}
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveNode}
        onDelete={handleDeleteNode}
        onPublish={handlePublishNode}
        projectId={params.projectId}
      />
    </div>
  )
}
