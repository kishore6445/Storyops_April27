"use client"

import { useState } from "react"
import { ArrowLeft, Plus, ChevronDown, ChevronRight, Trash2 } from "lucide-react"
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

interface Subtask {
  id: string
  title: string
  assigned_to?: string
  status: string
  progress_percentage: number
}

interface MainTask {
  id: string
  title: string
  wbs_code: string
  assigned_to?: string
  status: string
  progress_percentage: number
  due_date?: string
  subtasks: Subtask[]
}

export default function WBSClientPage({ params }: { params: { clientId: string } }) {
  const router = useRouter()
  const { data: clientData } = useSWR(`/api/clients/${params.clientId}`, fetcher)
  const { data: wbsData, mutate } = useSWR(`/api/clients/${params.clientId}/wbs`, fetcher)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [newTask, setNewTask] = useState({ title: "", assigned_to: "", due_date: "", promised_date: "" })

  const client = clientData?.clients?.[0] || {}
  const tasks: MainTask[] = wbsData?.tasks || []

  const toggleExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) return

    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(`/api/clients/${params.clientId}/wbs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newTask.title,
          assigned_to: newTask.assigned_to || undefined,
          due_date: newTask.due_date || undefined,
          promised_date: newTask.promised_date || undefined,
        }),
      })

      if (response.ok) {
        setNewTask({ title: "", assigned_to: "", due_date: "", promised_date: "" })
        setShowNewTaskForm(false)
        mutate()
      }
    } catch (error) {
      console.error("[v0] Error creating task:", error)
    }
  }

  const handleCreateSubtask = async (parentTaskId: string, subtaskTitle: string) => {
    if (!subtaskTitle.trim()) return

    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(`/api/clients/${params.clientId}/wbs/${parentTaskId}/subtasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ title: subtaskTitle }),
      })

      if (response.ok) {
        mutate()
      }
    } catch (error) {
      console.error("[v0] Error creating subtask:", error)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "to-do":
        return "bg-gray-100 text-gray-700"
      case "in-progress":
        return "bg-yellow-100 text-yellow-700"
      case "done":
        return "bg-green-100 text-green-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  if (!client || !client.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/wbs")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-light text-gray-900">{client.name} - WBS</h1>
              {client.description && (
                <p className="text-sm text-gray-600 mt-1">{client.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* New Task Button */}
        <button
          onClick={() => setShowNewTaskForm(!showNewTaskForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors mb-6"
        >
          <Plus className="w-5 h-5" />
          Add Main Task
        </button>

        {/* New Task Form */}
        {showNewTaskForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Main Task</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">
                  Assign To (optional)
                </label>
                <input
                  type="text"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  placeholder="Team member name or email"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">
                    Promised Date
                  </label>
                  <input
                    type="date"
                    value={newTask.promised_date}
                    onChange={(e) => setNewTask({ ...newTask, promised_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateTask}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Create Task
                </button>
                <button
                  onClick={() => {
                    setShowNewTaskForm(false)
                    setNewTask({ title: "", assigned_to: "", due_date: "", promised_date: "" })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">No tasks yet. Create your first WBS task.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-6">
                {/* Main Task Header */}
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleExpand(task.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0 mt-1"
                  >
                    {expandedTasks.has(task.id) ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 font-semibold text-sm rounded">
                            {task.wbs_code}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        </div>
                        {task.assigned_to && (
                          <p className="text-sm text-gray-600 mt-2">Assigned to: {task.assigned_to}</p>
                        )}
                        {task.due_date && (
                          <p className="text-sm text-gray-600 mt-1">Due: {new Date(task.due_date).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Progress</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusBadgeColor(task.status)}`}>
                            {task.status.replace("-", " ")}
                          </span>
                          <span className="text-xs font-semibold text-gray-900">{task.progress_percentage}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${task.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtasks */}
                {expandedTasks.has(task.id) && (
                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                    {task.subtasks?.length > 0 && (
                      <div className="space-y-2">
                        {task.subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                            <ChevronRight className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{subtask.title}</p>
                              {subtask.assigned_to && (
                                <p className="text-xs text-gray-600 mt-1">Assigned: {subtask.assigned_to}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusBadgeColor(subtask.status)}`}>
                                  {subtask.status.replace("-", " ")}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => {
                        const title = prompt("Enter subtask title:")
                        if (title) handleCreateSubtask(task.id, title)
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-3"
                    >
                      + Add Subtask
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
