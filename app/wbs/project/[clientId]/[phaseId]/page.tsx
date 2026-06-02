"use client"

import { useState } from "react"
import { Plus, ArrowLeft, Loader, ChevronDown, ChevronUp } from "lucide-react"
import { useRouter } from "next/navigation"
import useSWR from "swr"

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const response = await fetch(url, {
    headers: token ? { "Authorization": `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error("Failed to fetch")
  return response.json()
}

interface WBSTask {
  id: string
  wbs_code: string
  title: string
  assigned_to?: string
  status?: string
  progress_percentage?: number
  subtasks?: WBSTask[]
}

export default function WBSProjectPage({
  params,
}: {
  params: { clientId: string; phaseId: string }
}) {
  const router = useRouter()
  const { data: phaseData } = useSWR(
    `/api/clients/${params.clientId}/phases/${params.phaseId}`,
    fetcher
  )
  const { data: tasksData, mutate } = useSWR(
    `/api/clients/${params.clientId}/phases/${params.phaseId}/wbs`,
    fetcher
  )

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    assigned_to: "",
    due_date: "",
    promised_date: "",
  })

  const phase = phaseData?.phase || {}
  const tasks: WBSTask[] = tasksData?.tasks || []

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
      const response = await fetch(
        `/api/clients/${params.clientId}/phases/${params.phaseId}/wbs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            title: newTask.title,
            assigned_to: newTask.assigned_to || undefined,
            due_date: newTask.due_date || undefined,
            promised_date: newTask.promised_date || undefined,
          }),
        }
      )

      if (response.ok) {
        setNewTask({ title: "", assigned_to: "", due_date: "", promised_date: "" })
        setShowNewTaskForm(false)
        mutate()
      }
    } catch (error) {
      console.error("[v0] Error creating task:", error)
    }
  }

  const renderTaskTree = (taskList: WBSTask[]) => {
    return (
      <div className="space-y-2">
        {taskList.map((task) => (
          <div key={task.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-white p-4 flex items-center gap-3">
              {task.subtasks && task.subtasks.length > 0 && (
                <button
                  onClick={() => toggleExpand(task.id)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {expandedTasks.has(task.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
              {!task.subtasks && <div className="w-6" />}

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {task.wbs_code}
                  </span>
                  <h3 className="font-medium text-gray-900">{task.title}</h3>
                </div>
                {task.assigned_to && (
                  <p className="text-xs text-gray-500 mt-1">Assigned to: {task.assigned_to}</p>
                )}
              </div>

              {task.progress_percentage !== undefined && (
                <div className="w-24">
                  <div className="w-full bg-gray-200 rounded h-2">
                    <div
                      className="bg-blue-600 h-2 rounded transition-all"
                      style={{ width: `${task.progress_percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {expandedTasks.has(task.id) && task.subtasks && task.subtasks.length > 0 && (
              <div className="bg-gray-50 p-4 border-t border-gray-200">
                {renderTaskTree(task.subtasks)}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6">
        <button
          onClick={() => router.push("/wbs")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div>
          <h1 className="text-3xl font-light text-gray-900">{phase.name || "Project"} - WBS</h1>
          {phase.description && (
            <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
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
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Task</h3>
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
                  placeholder="Team member name"
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
                  onClick={() => setShowNewTaskForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tree */}
        <div>
          {tasksData === undefined ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No tasks yet. Create your first main task.</p>
            </div>
          ) : (
            renderTaskTree(tasks)
          )}
        </div>
      </div>
    </div>
  )
}
