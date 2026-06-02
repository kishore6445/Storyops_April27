"use client"

import { useState } from "react"
import { Save, Loader, Copy, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Meeting {
  id: string
  title?: string
  client_id?: string
  client_name?: string
  date: string
  time: string
  attendees: Array<{ id: string; full_name: string; email?: string }>
  summary?: string
  key_decisions?: string[]
}

interface MeetingsMomTabProps {
  meeting: Meeting
  onUpdate: () => void
}

export function MeetingsMomTab({ meeting, onUpdate }: MeetingsMomTabProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    summary: meeting.summary || "",
    keyDecisions: meeting.key_decisions || [""],
  })

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "Ready to share",
      duration: 2000,
    })
  }

  const handleCopyAllMOM = () => {
    const attendeesList = meeting.attendees && meeting.attendees.length > 0
      ? meeting.attendees.map((a) => a.full_name).join(", ")
      : "Not specified"
    
    const decisions = Array.isArray(formData.keyDecisions)
      ? formData.keyDecisions
          .filter((d) => d && d.trim())
          .map((d) => `• ${d}`)
          .join("\n")
      : "No action items"
    
    const momText = `📋 *MINUTES OF MEETING*

*Meeting Date:* ${meeting.date || "Not specified"}
*Time:* ${meeting.time || "Not specified"}

*Attendees:*
${attendeesList}

*Summary:*
${formData.summary || "No summary provided"}

*Action Items:*
${decisions}

---
Shared via StoryOps`
    
    handleCopyToClipboard(momText)
  }

  const handleAddDecision = () => {
    setFormData({
      ...formData,
      keyDecisions: [...formData.keyDecisions, ""],
    })
  }

  const handleUpdateDecision = (index: number, value: string) => {
    const updated = [...formData.keyDecisions]
    updated[index] = value
    setFormData({ ...formData, keyDecisions: updated })
  }

  const handleRemoveDecision = (index: number) => {
    setFormData({
      ...formData,
      keyDecisions: formData.keyDecisions.filter((_, i) => i !== index),
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          summary: formData.summary,
          keyDecisions: formData.keyDecisions.filter((d) => d.trim()),
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        onUpdate()
      }
    } catch (error) {
      console.error("[v0] Error saving MOM:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Minutes of Meeting</h3>
          <p className="text-sm text-gray-600">{meeting.client_name || meeting.client_id}</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {isEditing ? "Cancel" : "✎ Edit"}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-6 border-t border-gray-200 pt-6">
          {/* Summary Input */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Summary
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
              placeholder="Add meeting summary..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={5}
            />
          </div>

          {/* Key Decisions */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Key Decisions & Actions
            </label>
            <div className="space-y-2">
              {formData.keyDecisions.map((decision, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={decision}
                    onChange={(e) => handleUpdateDecision(index, e.target.value)}
                    placeholder="Add action item..."
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formData.keyDecisions.length > 1 && (
                    <button
                      onClick={() => handleRemoveDecision(index)}
                      className="px-3 py-2 text-gray-500 hover:text-red-600 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleAddDecision}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add action
              </button>
            </div>
          </div>

          {/* Save/Cancel */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader className="w-4 h-4 animate-spin" />}
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 border-t border-gray-200 pt-6">
          {/* Summary Display */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Summary</h4>
            {formData.summary ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {formData.summary}
              </p>
            ) : (
              <p className="text-sm text-gray-500">No summary added yet</p>
            )}
          </div>

          {/* Key Decisions Display */}
          {formData.keyDecisions.some((d) => d.trim()) && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Key Actions</h4>
              <ul className="space-y-2">
                {formData.keyDecisions.map(
                  (decision, index) =>
                    decision.trim() && (
                      <li key={index} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-semibold flex-shrink-0">•</span>
                        <span>{decision}</span>
                      </li>
                    )
                )}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={handleCopyAllMOM}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-900 hover:bg-gray-50 font-medium rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy for WhatsApp
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Knowledge Base
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
