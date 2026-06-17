"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader, Plus, Edit2, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import useSWR from "swr"

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const res = await fetch(url, {
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
}

interface Task {
  id: string
  title: string
  description?: string
  wbs_code?: string
  status: string
  priority: string
  parent_id?: string
  progress_percentage: number
  assigned_to?: string
  estimated_hours?: number
  due_date?: string
}

export default function WBSCanvas({ params }: { params: { projectId: string } }) {
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR(`/api/projects/${params.projectId}`, fetcher)
  const { data: tasksData } = useSWR(`/api/projects/${params.projectId}/tasks`, fetcher)
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Task>>({})

  const project = data?.project
  const tasks: Task[] = tasksData?.tasks || []

  // Build hierarchical tree
  const rootTasks = tasks.filter((t) => !t.parent_id)
  
  const getChildren = (parentId: string): Task[] => {
    return tasks.filter((t) => t.parent_id === parentId)
  }

  const toggleExpanded = (taskId: string) => {
    const newSet = new Set(expandedNodes)
    if (newSet.has(taskId)) {
      newSet.delete(taskId)
    } else {
      newSet.add(taskId)
    }
    setExpandedNodes(newSet)
  }

  const handleEdit = (task: Task) => {
    setSelectedTask(task)
    setEditForm(task)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!selectedTask) return

    try {
      const token = localStorage.getItem("sessionToken")
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editForm),
      })

      if (res.ok) {
        mutate()
        setShowForm(false)
        setSelectedTask(null)
      }
    } catch (error) {
      console.log("[v0] Save error:", error)
    }
  }

  const handleDelete = async () => {
    if (!selectedTask || !confirm("Delete this task?")) return

    try {
      const token = localStorage.getItem("sessionToken")
      await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      })

      mutate()
      setShowForm(false)
      setSelectedTask(null)
    } catch (error) {
      console.log("[v0] Delete error:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  const renderNode = (task: Task, depth: number = 0) => {
    const children = getChildren(task.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedNodes.has(task.id)

    return (
      <div key={task.id} className="mb-2">
        <div
          className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all group"
          style={{ marginLeft: `${depth * 24}px` }}
          onClick={() => handleEdit(task)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded(task.id)
              }}
              className="mt-0.5 flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4 flex-shrink-0" />}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {task.wbs_code && (
                <span className="text-xs font-mono font-bold bg-gray-200 px-2 py-1 rounded text-gray-700">
                  {task.wbs_code}
                </span>
              )}
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                {task.status}
              </span>
              <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded font-medium">
                {task.priority}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mt-1 break-words">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
            )}
            {task.progress_percentage > 0 && (
              <div className="mt-2 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${task.progress_percentage}%` }}
                />
              </div>
            )}
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Edit2 className="w-4 h-4 text-gray-500" />
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project?.name}</h1>
            <p className="text-sm text-gray-600 mt-1">WBS Canvas - Hierarchical task breakdown</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Back
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => {
              setShowForm(true)
              setSelectedTask(null)
              setEditForm({ status: "to-do", priority: "medium", progress_percentage: 0 })
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>

        {/* Task Tree */}
        <div className="space-y-2">
          {rootTasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No tasks yet. Create one to get started.</p>
            </div>
          ) : (
            rootTasks.map((task) => renderNode(task))
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedTask ? "Edit Task" : "New Task"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={editForm.title || ""}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Task title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editForm.status || "to-do"}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>to-do</option>
                      <option>in-progress</option>
                      <option>done</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={editForm.priority || "medium"}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>low</option>
                      <option>medium</option>
                      <option>high</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editForm.progress_percentage || 0}
                    onChange={(e) => setEditForm({ ...editForm, progress_percentage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Save
                </button>
                {selectedTask && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
