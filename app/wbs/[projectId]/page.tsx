"use client"

import { useState } from "react"
import { ArrowLeft, Plus, Edit2, Trash2, ChevronDown, ChevronRight, CheckCircle2, Circle } from "lucide-react"
import useSWR from "swr"
import { useRouter } from "next/navigation"

interface Task {
  id: string
  wbs_code: string
  title: string
  status: "to-do" | "in-progress" | "done"
  progress_percentage: number
  assigned_to_id?: string
  assigned_to_name?: string
  parent_task_id?: string
  subtasks?: Task[]
}

interface Project {
  id: string
  title: string
  goal: string
  progress_percentage: number
}

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const response = await fetch(url, {
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error("Failed to fetch")
  return response.json()
}

export default function WBSClientPage({ params }: { params: { projectId: string } }) {
  const router = useRouter()
  const { data: clientData } = useSWR(`/api/clients/${params.projectId}`, fetcher)
  const { data: wbsData, mutate } = useSWR(`/api/clients/${params.projectId}/wbs`, fetcher)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [parentTaskId, setParentTaskId] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({ title: "", assigned_to: "", due_date: "", promised_date: "" })

  const client: any = clientData?.clients?.[0] || {}
  const tasks: Task[] = wbsData?.wbs || []

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
      const response = await fetch(`/api/clients/${params.projectId}/wbs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newTask.title,
          assignee_id: newTask.assigned_to || undefined,
          due_date: newTask.due_date || undefined,
          promised_date: newTask.promised_date || undefined,
          parent_task_id: parentTaskId || undefined,
        }),
      })

      if (response.ok) {
        setNewTask({ title: "", assigned_to: "", due_date: "", promised_date: "" })
        setShowNewTaskForm(false)
        setParentTaskId(null)
        mutate()
      }
    } catch (error) {
      console.error("[v0] Error creating task:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      default:
        return <Circle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "to-do":
        return "text-gray-500"
      case "in-progress":
        return "text-yellow-600"
      case "done":
        return "text-green-600"
      default:
        return "text-gray-500"
    }
  }

  const TreeNode = ({ task, level = 0 }: { task: Task; level?: number }) => {
    const isExpanded = expandedTasks.has(task.id)
    const hasSubtasks = task.subtasks && task.subtasks.length > 0

    return (
      <div key={task.id} className="space-y-1">
        <div className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors ${level > 0 ? "ml-8" : ""}`}>
          {/* Expand/Collapse */}
          {hasSubtasks ? (
            <button
              onClick={() => toggleExpand(task.id)}
              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Status Icon */}
          {getStatusIcon(task.status)}

          {/* Task Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${getStatusColor(task.status)}`}>
                {task.wbs_code}
              </span>
              <span className={`text-sm ${getStatusColor(task.status)}`}>
                {task.title}
              </span>
            </div>
            {task.assigned_to_name && (
              <div className="text-xs text-gray-500 mt-1">
                Assigned to: {task.assigned_to_name}
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-xs font-semibold text-gray-600">
              {Math.round(task.progress_percentage)}%
            </div>
            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600"
                style={{ width: `${task.progress_percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Subtasks */}
        {hasSubtasks && isExpanded && (
          <div className="space-y-1">
            {task.subtasks!.map((subtask) => (
              <TreeNode key={subtask.id} task={subtask} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New {parentTaskId ? "Subtask" : "Main Task"}</h3>
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
                    setParentTaskId(null)
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

        {/* WBS Tree */}
        <div className="bg-white rounded-lg border border-gray-200">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No tasks yet. Create your first main task above.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <TreeNode key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
