"use client"

import { useState } from "react"
import { X, Save, Plus, Trash2, Send } from "lucide-react"
import { PublishToSprintDialog } from "./PublishToSprintDialog"

interface WBSNode {
  id: string
  wbs_code: string
  title: string
  description?: string
  status: string
  priority: string
  progress_percentage: number
  parent_id: string | null
  assigned_to?: string
  estimated_hours?: number
  due_date?: string
}

interface WBSNodeEditorProps {
  node: WBSNode | null
  isOpen: boolean
  onClose: () => void
  onSave: (updates: Partial<WBSNode>) => Promise<void>
  onDelete?: () => Promise<void>
  onAddChild?: () => void
  onPublish?: (sprintId: string) => Promise<void>
  projectId: string
}

export function WBSNodeEditor({
  node,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onAddChild,
  onPublish,
  projectId,
}: WBSNodeEditorProps) {
  const [formData, setFormData] = useState<Partial<WBSNode>>(node || {})
  const [isSaving, setIsSaving] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)

  if (!isOpen || !node) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) : value,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(formData)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async (sprintId: string) => {
    if (onPublish) {
      await onPublish(sprintId)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Edit Node</h2>
            <p className="text-xs text-gray-500 mt-1">Code: {node.wbs_code}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Title</label>
            <input
              type="text"
              name="title"
              value={formData.title || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description || ""}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status || "not-started"}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
              <select
                name="priority"
                value={formData.priority || "medium"}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Progress (%)</label>
            <input
              type="range"
              name="progress_percentage"
              min="0"
              max="100"
              value={formData.progress_percentage || 0}
              onChange={handleChange}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{formData.progress_percentage || 0}%</span>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Estimated Hours */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Estimated Hours</label>
            <input
              type="number"
              name="estimated_hours"
              min="0"
              step="0.5"
              value={formData.estimated_hours || ""}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          {onPublish && (
            <button
              onClick={() => setPublishDialogOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-green-300 text-green-600 hover:bg-green-50 rounded-lg font-medium"
            >
              <Send className="w-4 h-4" />
              Publish
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg">
            Close
          </button>
        </div>
      </div>

      {/* Publish to Sprint Dialog */}
      {onPublish && (
        <PublishToSprintDialog
          isOpen={publishDialogOpen}
          onClose={() => setPublishDialogOpen(false)}
          nodeTitle={node.title}
          projectId={projectId}
          onPublish={handlePublish}
        />
      )}
    </div>
  )
}
