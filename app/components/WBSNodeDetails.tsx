"use client"

import React, { useState, useEffect } from "react"
import { X, Save, Loader } from "lucide-react"
import useSWR from "swr"

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
  assigned_to?: string
  sprint_id?: string
  due_date?: string
  estimated_hours?: number
  progress_percentage: number
}

interface WBSNodeDetailsProps {
  item: WBSItem | null
  projectId: string
  onClose: () => void
  onSave: (updates: Partial<WBSItem>) => Promise<void>
  isLoading?: boolean
}

export function WBSNodeDetails({
  item,
  projectId,
  onClose,
  onSave,
  isLoading = false,
}: WBSNodeDetailsProps) {
  const [formData, setFormData] = useState<Partial<WBSItem>>({})
  const [isSaving, setIsSaving] = useState(false)
  const { data: sprintsData } = useSWR(
    item ? `/api/projects/${projectId}/sprints` : null,
    fetcher
  )

  const sprints = sprintsData?.sprints || []

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        assigned_to: item.assigned_to,
        sprint_id: item.sprint_id,
        due_date: item.due_date,
        estimated_hours: item.estimated_hours,
        progress_percentage: item.progress_percentage,
      })
    }
  }, [item])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) : value,
    }))
  }

  const handleSave = async () => {
    if (!item) return
    setIsSaving(true)
    try {
      await onSave(formData)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  if (!item) {
    return (
      <div className="w-full max-w-md bg-white rounded-lg border border-gray-200 p-6 flex items-center justify-center h-96">
        <p className="text-gray-500 text-center">Select a WBS item to view details</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">WBS Details</h3>
          <p className="text-sm text-gray-500 mt-1">Code: {item.wbs_code}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Title */}
        <div>
          <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description || ""}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status & Priority */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">Status</label>
            <select
              name="status"
              value={formData.status || "to-do"}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="to-do">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">Priority</label>
            <select
              name="priority"
              value={formData.priority || "medium"}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Sprint Selector */}
        <div>
          <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">
            Sprint
          </label>
          <select
            name="sprint_id"
            value={formData.sprint_id || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No sprint</option>
            {sprints.map((sprint: any) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee */}
        <div>
          <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">
            Assigned To
          </label>
          <input
            type="text"
            name="assigned_to"
            value={formData.assigned_to || ""}
            onChange={handleChange}
            placeholder="User ID or email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">Due Date</label>
          <input
            type="date"
            name="due_date"
            value={formData.due_date || ""}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Estimated Hours */}
        <div>
          <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">Estimated Hours</label>
          <input
            type="number"
            name="estimated_hours"
            value={formData.estimated_hours || ""}
            onChange={handleChange}
            step={0.5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Progress */}
        <div>
          <label className="text-xs text-gray-600 font-semibold uppercase block mb-2">Progress (%)</label>
          <input
            type="number"
            name="progress_percentage"
            value={formData.progress_percentage || 0}
            onChange={handleChange}
            min={0}
            max={100}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${formData.progress_percentage || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
