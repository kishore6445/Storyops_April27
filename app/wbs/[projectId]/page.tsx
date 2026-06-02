"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Plus, Loader, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { WBSTree } from "@/app/components/WBSTree"
import { WBSNodeDetails } from "@/app/components/WBSNodeDetails"

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const response = await fetch(url, {
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error("Failed to fetch")
  return response.json()
}

interface WBSItem {
  id: string
  parent_id: string | null
  title: string
  description?: string
  wbs_code: string
  status: string
  priority: string
  assignee_id?: string
  sprint_id?: string
  due_date?: string
  estimated_hours?: number
  progress_percentage: number
  linked_task_id?: string
  is_leaf_node: boolean
  position: number
  children?: WBSItem[]
}

export default function WBSProjectPage({
  params,
}: {
  params: { projectId: string }
}) {
  const router = useRouter()
  const { data: wbsData, isLoading, mutate } = useSWR(
    `/api/projects/${params.projectId}/wbs`,
    fetcher
  )

  const [selectedItem, setSelectedItem] = useState<WBSItem | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newItemData, setNewItemData] = useState({ title: "", parent_id: null as string | null })
  const [error, setError] = useState<string | null>(null)

  const tree: WBSItem[] = wbsData?.tree || []
  const items: WBSItem[] = wbsData?.items || []

  const handleAddRoot = () => {
    setNewItemData({ title: "", parent_id: null })
    setShowNewForm(true)
  }

  const handleAddChild = (parentId: string | null) => {
    setNewItemData({ title: "", parent_id: parentId })
    setShowNewForm(true)
  }

  const handleCreateItem = async () => {
    if (!newItemData.title.trim()) {
      setError("Title is required")
      return
    }

    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(`/api/projects/${params.projectId}/wbs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newItemData.title,
          parent_id: newItemData.parent_id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create WBS item")
      }

      setShowNewForm(false)
      setNewItemData({ title: "", parent_id: null })
      setError(null)
      mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create WBS item")
    }
  }

  const handleSaveItem = async (updates: Partial<WBSItem>) => {
    if (!selectedItem) return

    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(
        `/api/projects/${params.projectId}/wbs/${selectedItem.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(updates),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update WBS item")
      }

      setError(null)
      
      // Recalculate progress for entire tree
      const progressToken = localStorage.getItem("sessionToken")
      await fetch(
        `/api/projects/${params.projectId}/wbs/recalculate-progress`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(progressToken ? { "Authorization": `Bearer ${progressToken}` } : {}),
          },
        }
      ).catch(() => {
        // Silent fail for progress recalc
        console.log("[v0] Progress recalculation in background")
      })
      
      mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update WBS item")
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this WBS item and all its children?")) {
      return
    }

    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(`/api/projects/${params.projectId}/wbs/${itemId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete WBS item")
      }

      setSelectedItem(null)
      setError(null)
      mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete WBS item")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/wbs")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-light text-gray-900">Project WBS</h1>
              <p className="text-sm text-gray-600 mt-1">Hierarchical project structure planning</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mx-8 mt-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg flex items-gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Left: Tree View */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {/* Add Root Button */}
              <button
                onClick={handleAddRoot}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors mb-6"
              >
                <Plus className="w-5 h-5" />
                Add Phase
              </button>

              {/* Loading */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : tree.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No WBS items yet. Add your first phase.</p>
                </div>
              ) : (
                <WBSTree
                  items={tree}
                  selectedId={selectedItem?.id}
                  onSelect={setSelectedItem}
                  onAddChild={handleAddChild}
                  onEdit={setSelectedItem}
                  onDelete={handleDeleteItem}
                />
              )}
            </div>
          </div>

          {/* Right: Details Panel */}
          <div className="col-span-1">
            {/* New Item Form */}
            {showNewForm && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">New WBS Item</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newItemData.title}
                      onChange={(e) =>
                        setNewItemData({ ...newItemData, title: e.target.value })
                      }
                      placeholder="Phase name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateItem}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Details Panel */}
            <WBSNodeDetails
              item={selectedItem}
              projectId={params.projectId}
              onClose={() => setSelectedItem(null)}
              onSave={handleSaveItem}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
