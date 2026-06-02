"use client"

import { useState } from "react"
import { ArrowLeft, Plus, Loader } from "lucide-react"
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
  wbs_code: string
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
  const { data: wbsData, isLoading: wbsLoading } = useSWR(`/api/clients/${params.clientId}/wbs`, fetcher)
  const [clientName, setClientName] = useState("Project")
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [newTask, setNewTask] = useState({ title: "", assigned_to: "" })

  const tasks: MainTask[] = wbsData?.tasks || []

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      alert("Please enter a phase name")
      return
    }

    try {
      const token = localStorage.getItem("sessionToken")
      console.log("[v0] Creating phase with:", { title: newTask.title, assigned_to: newTask.assigned_to, clientId: params.clientId, token: !!token })
      
      const response = await fetch(`/api/clients/${params.clientId}/wbs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newTask.title,
          assigned_to: newTask.assigned_to || undefined,
        }),
      })

      console.log("[v0] Response status:", response.status)
      const responseData = await response.json()
      console.log("[v0] Response data:", responseData)

      if (response.ok) {
        setNewTask({ title: "", assigned_to: "" })
        setShowNewTaskForm(false)
        alert("Phase created successfully!")
        // Refresh the WBS data
        window.location.reload()
      } else {
        alert("Error creating phase: " + (responseData.error || "Unknown error"))
      }
    } catch (error) {
      console.error("[v0] Error creating task:", error)
      alert("Error creating phase: " + error)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 sticky top-0 z-20 bg-white">
        <div className="px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/wbs")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-light text-gray-900">{clientName} - WBS Diagram</h1>
              <p className="text-sm text-gray-600 mt-1">Hierarchical project structure visualization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Add Task Button */}
        <button
          onClick={() => setShowNewTaskForm(!showNewTaskForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors mb-6"
        >
          <Plus className="w-5 h-5" />
          Add Phase
        </button>

        {/* New Task Form */}
        {showNewTaskForm && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Phase</h3>
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">Phase Name</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g., Hardware, Software, System"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">Owner (optional)</label>
                <input
                  type="text"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                  placeholder="Team member or department"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTask}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Create Phase
                </button>
                <button
                  onClick={() => setShowNewTaskForm(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WBS Diagram */}
        {wbsLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader className="w-8 h-8 text-gray-400 animate-spin mb-4" />
            <p className="text-gray-600">Loading WBS structure...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-600">No phases created yet. Add your first phase to start building the WBS.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg bg-gray-50">
            {/* WBS Tree Visualization */}
            <div className="p-8 inline-block min-w-full">
              {/* Level 1: PROJECT TITLE */}
              <div className="flex justify-center mb-12">
                <div className="px-6 py-3 bg-gray-900 text-white font-bold rounded text-center border-2 border-gray-900">
                  PROJECT
                </div>
              </div>

              {/* Horizontal line under PROJECT */}
              <div className="flex justify-center mb-12 relative">
                <div className="w-full h-0.5 bg-gray-400 absolute top-0"></div>
                
                {/* Level 2: PHASES (Horizontal) */}
                <div className="flex gap-6 relative z-10">
                  {tasks.map((task, index) => (
                    <div key={task.id} className="flex flex-col items-center">
                      {/* Phase Container */}
                      <div className="bg-blue-100 border-2 border-blue-400 px-4 py-2 rounded font-semibold text-sm text-center min-w-24 mb-6">
                        {task.title}
                      </div>

                      {/* Vertical line connecting to subtasks */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="w-0.5 h-6 bg-gray-400 mb-4"></div>
                      )}

                      {/* Subtasks (Vertical) */}
                      <div className="space-y-2 relative">
                        {task.subtasks && task.subtasks.length > 0 && (
                          <>
                            {/* Horizontal connector for subtasks */}
                            <div className="absolute -left-2 top-2 w-4 h-0.5 bg-gray-400"></div>
                            
                            <div className="space-y-2 pl-2 border-l-2 border-gray-400">
                              {task.subtasks.map((subtask) => (
                                <div key={subtask.id} className="flex items-center gap-2">
                                  <div className="w-3 h-0.5 bg-gray-400"></div>
                                  <div className="bg-white border border-gray-300 px-3 py-1 rounded text-xs font-medium text-gray-700 min-w-24 text-center">
                                    {subtask.wbs_code}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Empty state for no subtasks */}
                        {(!task.subtasks || task.subtasks.length === 0) && (
                          <div className="bg-white border border-gray-300 px-3 py-1 rounded text-xs font-medium text-gray-700 min-w-24 text-center">
                            <span className="text-gray-400">No tasks</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-12 pt-6 border-t border-gray-300 text-sm text-gray-600 space-y-2">
                <p><strong>Level 1:</strong> Project Goal</p>
                <p><strong>Level 2:</strong> Phases (Horizontal)</p>
                <p><strong>Level 3+:</strong> Tasks and Subtasks (Vertical)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
