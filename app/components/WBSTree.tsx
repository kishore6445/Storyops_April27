"use client"

import React, { useState, useCallback } from "react"
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, GripVertical } from "lucide-react"

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

interface WBSTreeProps {
  items: WBSItem[]
  selectedId?: string
  onSelect: (item: WBSItem) => void
  onAddChild: (parentId: string | null) => void
  onEdit: (item: WBSItem) => void
  onDelete: (itemId: string) => void
}

export function WBSTree({
  items,
  selectedId,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
}: WBSTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const renderItem = (item: WBSItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expanded.has(item.id)
    const isSelected = selectedId === item.id

    const statusColors: Record<string, string> = {
      "not-started": "bg-gray-100 text-gray-700",
      "in-progress": "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
    }

    const priorityColors: Record<string, string> = {
      low: "text-gray-500",
      medium: "text-orange-500",
      high: "text-red-500",
      critical: "text-red-700 font-bold",
    }

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            isSelected ? "bg-blue-50 border-l-2 border-blue-500" : "hover:bg-gray-50"
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpand(item.id)}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <button
            onClick={() => onSelect(item)}
            className="flex-1 flex items-center gap-3 min-w-0 text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-block px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-mono rounded font-semibold">
                  {item.wbs_code}
                </span>
                <span className={`text-sm font-medium truncate ${isSelected ? "text-blue-600" : "text-gray-900"}`}>
                  {item.title}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${statusColors[item.status] || statusColors["not-started"]}`}>
                  {item.status.replace("-", " ")}
                </span>
                <span className={`text-xs font-medium ${priorityColors[item.priority] || "text-gray-500"}`}>
                  {item.priority}
                </span>
              </div>
            </div>
          </button>

          {/* Progress bar */}
          <div className="w-16 h-1.5 bg-gray-300 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${item.progress_percentage}%` }}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(item)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
            <button
              onClick={() => onAddChild(item.id)}
              className="p-1 hover:bg-green-100 rounded transition-colors"
              title="Add child"
            >
              <Plus className="w-4 h-4 text-green-600" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="relative">
            {item.children!.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {items.map((item) => renderItem(item))}
    </div>
  )
}
