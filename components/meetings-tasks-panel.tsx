"use client"

import { useState } from "react"
import { Plus, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  assignee?: { id: string; full_name: string }
  due_date?: string
  promised_date?: string
  priority?: "high" | "medium" | "low"
  status?: "to-do" | "in-progress" | "done"
}

interface MeetingsTasksPanelProps {
  meeting: { id: string; title?: string }
  tasks?: Task[]
  onAddTask?: () => void
}

const priorityColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
}

const statusColors = {
  "to-do": "bg-gray-100 text-gray-700",
  "in-progress": "bg-blue-100 text-blue-700",
  "done": "bg-green-100 text-green-700",
}

export function MeetingsTasksPanel({ 
  meeting, 
  tasks = [], 
  onAddTask 
}: MeetingsTasksPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTask, setNewTask] = useState({ 
    title: "", 
    assignee: "", 
    priority: "medium",
    due_date: "",
    promised_date: ""
  })

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return

    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(`/api/meetings/${meeting.id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: newTask.title,
          assignee: newTask.assignee || undefined,
          priority: newTask.priority,
          due_date: newTask.due_date || undefined,
          promised_date: newTask.promised_date || undefined,
        }),
      })

      if (response.ok) {
        setNewTask({ title: "", assignee: "", priority: "medium", due_date: "", promised_date: "" })
        setShowAddForm(false)
        onAddTask?.()
      }
    } catch (error) {
      console.error("[v0] Error adding task:", error)
    }
  }

  const completedCount = tasks.filter((t) => t.status === "done").length
  const tasksProgress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Tasks from this Meeting</h3>
        <p className="text-sm text-gray-600 mt-1">
          {completedCount}/{tasks.length} tasks completed
        </p>
      </div>

      {/* Progress Bar */}
      {tasks.length > 0 && (
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${tasksProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 font-medium">{tasksProgress}%</span>
          </div>
        </div>
      )}

      {/* Add Task Button */}
      <div className="px-6 py-3 border-b border-gray-200">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Task title..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <input
              type="text"
              placeholder="Assignee name..."
              value={newTask.assignee}
              onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">
                  Due Date
                  <span className="text-gray-400 text-xs font-normal ml-1">(internal)</span>
                </label>
                <input
                  type="date"
                  title="Internal deadline for task completion"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-1">
                  Promised Date
                  <span className="text-gray-400 text-xs font-normal ml-1">(client)</span>
                </label>
                <input
                  type="date"
                  title="Promised delivery date to client"
                  value={newTask.promised_date}
                  onChange={(e) => setNewTask({ ...newTask, promised_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={handleAddTask}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors"
              >
                Add Task
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No tasks yet</p>
            <p className="text-xs text-gray-400 mt-1">Add your first task to track progress</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={task.status === "done"}
                    className="mt-0.5 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium",
                      task.status === "done" ? "line-through text-gray-500" : "text-gray-900"
                    )}>
                      {task.title}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="space-y-2 pl-6">
                  {task.assignee && (
                    <div className="text-xs text-gray-600">
                      <span className="text-gray-500">Assigned to:</span> {task.assignee.full_name}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {task.due_date && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.promised_date && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        Promised: {new Date(task.promised_date).toLocaleDateString()}
                      </span>
                    )}
                    {task.priority && (
                      <span className={cn("text-xs px-2 py-1 rounded", priorityColors[task.priority])}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    )}
                    {task.status && (
                      <span className={cn("text-xs px-2 py-1 rounded", statusColors[task.status])}>
                        {task.status === "to-do" ? "To Do" : task.status === "in-progress" ? "In Progress" : "Done"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
