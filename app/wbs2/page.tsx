"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import { statusBadgeClass } from "./utils"

// ─── Types ─────────────────────────────────────────────────────────────────────

type NodeStatus = "Not Started" | "In Progress" | "Waiting Client" | "Blocked" | "Done"
type NodeType = "Workstream" | "Task" | "Subtask" | "Ad"

interface DbNode {
  id: string
  plan_id: string
  workstream_id: string
  parent_id: string | null
  code: string
  title: string
  type: NodeType
  description: string
  assignee: string
  status: NodeStatus
  priority: "Low" | "Medium" | "High"
  sprint: string
  client_promised_date: string | null
  internal_due_date: string | null
  position: number
}

interface DbWorkstream {
  id: string
  plan_id: string
  code: string
  title: string
  color: string
  position: number
}

interface DbPlan {
  id: string
  client_id: string | null
  client_name: string
  wbs_name: string
  start_date: string | null
  end_date: string | null
}

interface DbClient {
  id: string
  name: string
}

interface DbUser {
  id: string
  full_name: string
  email: string
}

// A "virtual" node used only for rendering — includes its children hydrated
interface VNode extends DbNode {
  children: VNode[]
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const WORKSTREAM_COLORS = [
  "#6172f3", "#00b341", "#e040fb", "#ff6d00", "#00bcd4", "#f44336",
]

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Safe array fetcher — always returns an array even if the API returns an error object
const arrayFetcher = (url: string) =>
  fetch(url).then((r) => r.json()).then((d) => (Array.isArray(d) ? d : []))

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function buildTree(nodes: DbNode[], wsId: string): VNode[] {
  const map = new Map<string, VNode>()
  const roots: VNode[] = []
  const wsNodes = nodes.filter((n) => n.workstream_id === wsId)

  for (const n of wsNodes) {
    map.set(n.id, { ...n, children: [] })
  }
  for (const n of wsNodes) {
    const vn = map.get(n.id)!
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!.children.push(vn)
    } else if (!n.parent_id) {
      roots.push(vn)
    }
  }
  // sort by position
  const sortByPos = (arr: VNode[]) => {
    arr.sort((a, b) => a.position - b.position)
    arr.forEach((n) => sortByPos(n.children))
  }
  sortByPos(roots)
  return roots
}

function getAllLeaves(nodes: VNode[]): VNode[] {
  let out: VNode[] = []
  for (const n of nodes) {
    if (!n.children.length) out.push(n)
    else out = out.concat(getAllLeaves(n.children))
  }
  return out
}

function getBottlenecks(
  nodes: VNode[],
  path: string
): { title: string; path: string; status: NodeStatus; assignee: string }[] {
  const result: { title: string; path: string; status: NodeStatus; assignee: string }[] = []
  for (const n of nodes) {
    if (n.status === "Blocked" || n.status === "Waiting Client") {
      result.push({ title: n.title, path, status: n.status, assignee: n.assignee })
    }
    result.push(...getBottlenecks(n.children, `${path} → ${n.title}`))
  }
  return result
}

// ─── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({
  selectedNode,
  users,
  workstreams,
  allNodes,
  planId,
  clientId,
  onRefresh,
  onDeselect,
}: {
  selectedNode: DbNode | null
  users: DbUser[]
  workstreams: DbWorkstream[]
  allNodes: DbNode[]
  planId: string
  clientId: string | null
  onRefresh: () => void
  onDeselect: () => void
}) {
  const [form, setForm] = useState<Partial<DbNode>>({})
  const [saving, setSaving] = useState(false)

  // Fetch sprints for the current client (uses service-role key, no auth required)
  const { data: sprintsData } = useSWR<any>(
    clientId ? `/api/wbs2/sprints?clientId=${clientId}` : null,
    fetcher
  )
  const sprints: { id: string; name: string }[] = Array.isArray(sprintsData?.sprints) ? sprintsData.sprints : []

  // Reset form when selected node changes
  useEffect(() => {
    if (selectedNode) setForm({ ...selectedNode })
    else setForm({})
  }, [selectedNode?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build bottlenecks from all nodes across all workstreams
  const bottlenecks = workstreams.flatMap((ws) => {
    const tree = buildTree(allNodes, ws.id)
    return getBottlenecks(tree, ws.title)
  })

  const set = (key: keyof DbNode, val: unknown) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  async function handleSave() {
    if (!selectedNode) return
    setSaving(true)
    const patch: Record<string, unknown> = { ...form }
    delete patch.id
    delete patch.plan_id
    delete patch.workstream_id
    delete patch.parent_id
    delete patch.created_at
    delete patch.children
    await fetch(`/api/wbs2/plans/${planId}/nodes/${selectedNode.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    setSaving(false)
    onRefresh()
  }

  async function handleAddChild() {
    if (!selectedNode) return
    const childNum = allNodes.filter((n) => n.parent_id === selectedNode.id).length + 1
    const newCode = `${selectedNode.code}.${childNum}`
    const maxPos = allNodes.filter((n) => n.parent_id === selectedNode.id).reduce((m, n) => Math.max(m, n.position), -1)
    await fetch(`/api/wbs2/plans/${planId}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workstream_id: selectedNode.workstream_id,
        parent_id: selectedNode.id,
        code: newCode,
        title: "New Task",
        type: "Subtask",
        position: maxPos + 1,
      }),
    })
    onRefresh()
  }

  async function handleAddSibling() {
    if (!selectedNode) return
    const siblings = allNodes.filter((n) => n.parent_id === selectedNode.parent_id && n.workstream_id === selectedNode.workstream_id)
    const sortedSiblings = [...siblings].sort((a, b) => a.position - b.position)
    const myIdx = sortedSiblings.findIndex((n) => n.id === selectedNode.id)
    const codeParts = selectedNode.code.split(".")
    const newCode = [...codeParts.slice(0, -1), String(Number(codeParts[codeParts.length - 1]) + 1)].join(".")
    await fetch(`/api/wbs2/plans/${planId}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workstream_id: selectedNode.workstream_id,
        parent_id: selectedNode.parent_id || null,
        code: newCode,
        title: "New Sibling",
        type: selectedNode.type,
        position: myIdx + 1,
      }),
    })
    onRefresh()
  }

  async function handleDelete() {
    if (!selectedNode) return
    if (!confirm(`Delete "${selectedNode.title}" and all its children?`)) return
    await fetch(`/api/wbs2/plans/${planId}/nodes/${selectedNode.id}`, { method: "DELETE" })
    onDeselect()
    onRefresh()
  }

  const assigneeOptions = [
    "Unassigned",
    ...users.map((u) => u.full_name || u.email),
  ]

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white border-l border-gray-200">
      {/* CEO Edit Panel */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-2">CEO Edit Panel</h3>
        <div className="rounded bg-yellow-50 border border-yellow-200 p-3 text-xs text-gray-700 leading-relaxed">
          Workstreams are fully dynamic. Add Facebook, Website, Posting, Campaign Setup, SEO,
          WhatsApp — anything you want. Click any box to edit it here.
        </div>
      </div>

      {/* Bottleneck Radar */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Bottleneck Radar</h3>
        {bottlenecks.length === 0 ? (
          <p className="text-xs text-gray-400">No bottlenecks found.</p>
        ) : (
          <div className="space-y-3">
            {bottlenecks.map((b, i) => (
              <div key={i} className="border-l-4 border-red-500 pl-3">
                <div className="text-sm font-semibold text-gray-900">{b.title}</div>
                <div className="text-xs text-gray-500">{b.path}</div>
                <div className="text-xs text-gray-500">{b.status} • {b.assignee}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Box */}
      <div className="p-4 flex-1">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Selected Box</h3>
        {!selectedNode ? (
          <p className="text-xs text-gray-400">Click any card to edit it here.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.title ?? ""}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.type ?? "Task"}
                onChange={(e) => set("type", e.target.value as NodeType)}
              >
                <option>Workstream</option>
                <option>Task</option>
                <option>Subtask</option>
                <option>Ad</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assign To</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.assignee ?? "Unassigned"}
                onChange={(e) => set("assignee", e.target.value)}
              >
                {assigneeOptions.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Client Promised Date
              </label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.client_promised_date ?? ""}
                onChange={(e) => set("client_promised_date", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Internal Due Date
              </label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.internal_due_date ?? ""}
                onChange={(e) => set("internal_due_date", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Sprint</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.sprint ?? "Unassigned"}
                onChange={(e) => set("sprint", e.target.value)}
              >
                <option value="Unassigned">Unassigned</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.priority ?? "Medium"}
                onChange={(e) => set("priority", e.target.value as DbNode["priority"])}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status ?? "Not Started"}
                onChange={(e) => set("status", e.target.value as NodeStatus)}
              >
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Waiting Client</option>
                <option>Blocked</option>
                <option>Done</option>
              </select>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded bg-blue-700 text-white text-sm font-semibold py-2 hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAddChild}
                className="rounded bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                + Add Child
              </button>
              <button
                onClick={handleAddSibling}
                className="rounded bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                + Add Sibling
              </button>
              <button
                onClick={handleDelete}
                className="rounded bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors ml-auto"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── WBS Node Card ─────────────────────────────────────────────────────────────

function WBSNodeCard({
  node,
  wsColor,
  selectedId,
  allNodes,
  planId,
  onSelect,
  onRefresh,
}: {
  node: VNode
  wsColor: string
  selectedId: string | null
  allNodes: DbNode[]
  planId: string
  onSelect: (id: string) => void
  onRefresh: () => void
}) {
  const isSelected = selectedId === node.id

  async function addChild(e: React.MouseEvent) {
    e.stopPropagation()
    const childNum = node.children.length + 1
    await fetch(`/api/wbs2/plans/${planId}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workstream_id: node.workstream_id,
        parent_id: node.id,
        code: `${node.code}.${childNum}`,
        title: "New Task",
        type: "Subtask",
        position: childNum - 1,
      }),
    })
    onRefresh()
  }

  async function addSibling(e: React.MouseEvent) {
    e.stopPropagation()
    const codeParts = node.code.split(".")
    const newCode = [...codeParts.slice(0, -1), String(Number(codeParts[codeParts.length - 1]) + 1)].join(".")
    const siblings = allNodes.filter(
      (n) => n.parent_id === node.parent_id && n.workstream_id === node.workstream_id
    )
    await fetch(`/api/wbs2/plans/${planId}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workstream_id: node.workstream_id,
        parent_id: node.parent_id || null,
        code: newCode,
        title: "New Sibling",
        type: node.type,
        position: siblings.length,
      }),
    })
    onRefresh()
  }

  const fmt = (d: string | null) => (d ? d.slice(0, 10) : "—")

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={() => onSelect(node.id)}
        className="cursor-pointer rounded-xl border-2 bg-white p-4 shadow-sm w-52 transition-all hover:shadow-md"
        style={{ borderColor: isSelected ? "#2563eb" : wsColor }}
      >
        <div className="text-xs text-gray-400 mb-0.5">{node.code}</div>
        <div className="font-bold text-gray-900 text-sm leading-tight mb-1">{node.title}</div>
        <div className="text-xs text-gray-500 mb-0.5">
          {node.type} • {node.assignee}
        </div>
        <div className="text-xs text-gray-500 mb-0.5">
          Client: {fmt(node.client_promised_date)} • Due: {fmt(node.internal_due_date)}
        </div>
        <div className="text-xs text-gray-500 mb-2">Sprint: {node.sprint}</div>
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(node.status)}`}>
          {node.status}
        </span>
        <div className="mt-3 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={addChild}
            className="rounded border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
          >
            + Child
          </button>
          <button
            onClick={addSibling}
            className="rounded border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
          >
            + Sibling
          </button>
          <button
            onClick={() => onSelect(node.id)}
            className="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <div className="relative mt-6">
          <div className="absolute left-1/2 -top-6 w-px h-6" style={{ background: wsColor }} />
          {node.children.length > 1 && (
            <div
              className="absolute top-0 h-px"
              style={{
                background: wsColor,
                left: `calc(${(1 / (2 * node.children.length)) * 100}%)`,
                right: `calc(${(1 / (2 * node.children.length)) * 100}%)`,
              }}
            />
          )}
          <div className="flex gap-4 relative">
            {node.children.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center">
                <div className="w-px h-4" style={{ background: wsColor }} />
                <WBSNodeCard
                  node={child}
                  wsColor={wsColor}
                  selectedId={selectedId}
                  allNodes={allNodes}
                  planId={planId}
                  onSelect={onSelect}
                  onRefresh={onRefresh}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Workstream Block ──────────────────────────────────────────────────────────

function WorkstreamBlock({
  ws,
  allNodes,
  selectedId,
  planId,
  onSelect,
  onRefresh,
}: {
  ws: DbWorkstream
  allNodes: DbNode[]
  selectedId: string | null
  planId: string
  onSelect: (id: string) => void
  onRefresh: () => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState(ws.title)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setTitleVal(ws.title) }, [ws.title])

  const roots = buildTree(allNodes, ws.id)
  const leaves = roots.flatMap((r) => getAllLeaves([r]))
  const pct = leaves.length ? Math.round((leaves.filter((n) => n.status === "Done").length / leaves.length) * 100) : 0
  const leafCount = leaves.length || 1

  async function addVertical() {
    const topLevel = allNodes.filter((n) => n.workstream_id === ws.id && !n.parent_id)
    const nextNum = topLevel.length + 1
    const wsNum = ws.code.split(".")[0]
    await fetch(`/api/wbs2/plans/${planId}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workstream_id: ws.id,
        parent_id: null,
        code: `${wsNum}.${nextNum}`,
        title: "New Vertical",
        type: "Task",
        position: topLevel.length,
      }),
    })
    onRefresh()
  }

  async function saveTitle() {
    setEditingTitle(false)
    if (titleVal === ws.title) return
    await fetch(`/api/wbs2/plans/${planId}/workstreams/${ws.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleVal }),
    })
    onRefresh()
  }

  async function deleteWorkstream() {
    if (!confirm(`Delete workstream "${ws.title}" and all its tasks?`)) return
    await fetch(`/api/wbs2/plans/${planId}/workstreams/${ws.id}`, { method: "DELETE" })
    onRefresh()
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden mb-6">
      <div className="h-1" style={{ background: ws.color }} />
      <div className="flex items-start justify-between px-6 py-4">
        <div>
          {editingTitle ? (
            <input
              ref={titleRef}
              className="text-xl font-bold border-b-2 border-blue-400 outline-none bg-transparent"
              style={{ color: ws.color }}
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle() }}
              autoFocus
            />
          ) : (
            <h2
              className="text-xl font-bold leading-tight cursor-pointer hover:underline"
              style={{ color: ws.color }}
              onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.focus(), 0) }}
            >
              {ws.code} {ws.title}
            </h2>
          )}
          <div className="text-sm text-gray-500 mt-0.5">
            {pct}% complete • {leafCount} leaf task{leafCount !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={addVertical}
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            + Add Vertical
          </button>
          <button
            onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.focus(), 0) }}
            className="text-sm font-semibold text-gray-600 hover:underline"
          >
            Edit Workstream
          </button>
          <button
            onClick={deleteWorkstream}
            className="text-sm font-semibold text-red-500 hover:underline"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="px-6 pb-6">
        {roots.length === 0 ? (
          <button
            onClick={addVertical}
            className="w-full rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 py-8 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
          >
            + Add first vertical task under this workstream
          </button>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-2">
            {roots.map((node) => (
              <WBSNodeCard
                key={node.id}
                node={node}
                wsColor={ws.color}
                selectedId={selectedId}
                allNodes={allNodes}
                planId={planId}
                onSelect={onSelect}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ workstreams, allNodes }: { workstreams: DbWorkstream[]; allNodes: DbNode[] }) {
  const allRoots = workstreams.flatMap((ws) => buildTree(allNodes, ws.id))
  const allLeaves = allRoots.flatMap((r) => getAllLeaves([r]))
  const totalLeaves = allLeaves.length
  const done = allLeaves.filter((n) => n.status === "Done").length
  const overall = totalLeaves ? Math.round((done / totalLeaves) * 100) : 0
  const blocked = allLeaves.filter((n) => n.status === "Blocked" || n.status === "Waiting Client").length
  const today = new Date().toISOString().split("T")[0]
  const dueSoon = allLeaves.filter(
    (n) => n.internal_due_date && n.internal_due_date <= today && n.status !== "Done"
  ).length

  const cards = [
    { label: "WBS Type", value: "Monthly" },
    { label: "Overall Progress", value: `${overall}%` },
    { label: "Leaf Tasks", value: totalLeaves },
    { label: "Blocked / Waiting", value: blocked },
    { label: "Due Soon", value: dueSoon },
  ]

  return (
    <div className="grid grid-cols-5 gap-4 mb-5">
      {cards.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
        </div>
      ))}
    </div>
  )
}

// ─── New Plan Modal ────────────────────────────────────────────────────────────

function NewPlanModal({
  clients,
  onClose,
  onCreated,
}: {
  clients: DbClient[]
  onClose: () => void
  onCreated: (plan: DbPlan) => void
}) {
  const [clientId, setClientId] = useState("")
  const [clientName, setClientName] = useState("")
  const [wbsName, setWbsName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!clientName || !wbsName) return
    setSaving(true)
    const res = await fetch("/api/wbs2/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId || null, client_name: clientName, wbs_name: wbsName, start_date: startDate || null, end_date: endDate || null }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { alert(data.error); return }
    onCreated(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Create New WBS Plan</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Client</label>
            <select
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value)
                const found = clients?.find((c) => c.id === e.target.value)
                if (found) setClientName(found.name)
              }}
            >
              <option value="">-- Select client --</option>
              {clients?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {!clientId && (
              <input
                className="mt-2 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                placeholder="Or type client name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">WBS Name</label>
            <input
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. June Growth Campaign"
              value={wbsName}
              onChange={(e) => setWbsName(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
              <input type="date" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
              <input type="date" className="w-full rounded border border-gray-300 px-3 py-2 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !clientName || !wbsName}
            className="rounded bg-blue-700 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create Plan"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────��─────────────────────────────────────────────────────────

export default function WBS2Page() {
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showNewPlan, setShowNewPlan] = useState(false)

  // Remote data
  const { data: plans = [], mutate: mutatePlans } = useSWR<DbPlan[]>("/api/wbs2/plans", arrayFetcher)
  const { data: clients = [] } = useSWR<DbClient[]>("/api/wbs2/clients", arrayFetcher)
  const { data: users = [] } = useSWR<DbUser[]>("/api/wbs2/users", arrayFetcher)
  const {
    data: planData,
    mutate: mutatePlan,
  } = useSWR<{ plan: DbPlan; workstreams: DbWorkstream[]; nodes: DbNode[] }>(
    activePlanId ? `/api/wbs2/plans/${activePlanId}` : null,
    fetcher
  )

  const plan = planData?.plan ?? null
  const workstreams = planData?.workstreams ?? []
  const allNodes = planData?.nodes ?? []

  // When plans load, auto-select the first one
  useEffect(() => {
    if (!activePlanId && plans.length > 0) {
      setActivePlanId(plans[0].id)
    }
  }, [plans, activePlanId])

  const selectedNode = selectedNodeId
    ? allNodes.find((n) => n.id === selectedNodeId) ?? null
    : null

  // Plan-level header editing
  const [headerDraft, setHeaderDraft] = useState<Partial<DbPlan>>({})
  useEffect(() => {
    if (plan) setHeaderDraft({ client_name: plan.client_name, wbs_name: plan.wbs_name, start_date: plan.start_date ?? "", end_date: plan.end_date ?? "" })
  }, [plan?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveHeaderDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  function updateHeader(key: keyof DbPlan, val: string) {
    setHeaderDraft((prev) => ({ ...prev, [key]: val }))
    if (saveHeaderDebounce.current) clearTimeout(saveHeaderDebounce.current)
    saveHeaderDebounce.current = setTimeout(async () => {
      if (!activePlanId) return
      await fetch(`/api/wbs2/plans/${activePlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: val || null }),
      })
      mutatePlan()
      mutatePlans()
    }, 800)
  }

  async function handleAddWorkstream() {
    if (!activePlanId) return
    const nextNum = workstreams.length + 1
    const color = WORKSTREAM_COLORS[(nextNum - 1) % WORKSTREAM_COLORS.length]
    await fetch(`/api/wbs2/plans/${activePlanId}/workstreams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: `${nextNum}.0`,
        title: "New Workstream",
        color,
        position: nextNum - 1,
      }),
    })
    mutatePlan()
  }

  function handlePlanCreated(newPlan: DbPlan) {
    setShowNewPlan(false)
    mutatePlans()
    setActivePlanId(newPlan.id)
    setSelectedNodeId(null)
  }

  const isLoading = activePlanId && !planData
  const hasPlans = plans.length > 0

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* ── Header ── */}
      <header className="flex items-center gap-4 px-5 py-3 bg-[#0d1117] sticky top-0 z-30 flex-wrap">
        <span className="text-yellow-400 font-extrabold text-xl mr-2 whitespace-nowrap">
          StoryOps WBS
        </span>

        {/* Plan selector */}
        <div className="flex flex-col">
          <label className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
            Plan
          </label>
          <select
            value={activePlanId ?? ""}
            onChange={(e) => { setActivePlanId(e.target.value); setSelectedNodeId(null) }}
            className="rounded border border-gray-600 bg-[#1a2233] text-white text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[160px]"
          >
            {!hasPlans && <option value="">No plans yet</option>}
            {plans?.map((p) => (
              <option key={p.id} value={p.id}>{p.client_name} — {p.wbs_name}</option>
            ))}
          </select>
        </div>

        {/* Client name (editable) */}
        <div className="flex flex-col">
          <label className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
            Client
          </label>
          <input
            value={headerDraft.client_name ?? ""}
            onChange={(e) => updateHeader("client_name", e.target.value)}
            disabled={!plan}
            className="rounded border border-gray-600 bg-[#1a2233] text-white text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[130px] disabled:opacity-40"
          />
        </div>

        {/* WBS Name */}
        <div className="flex flex-col">
          <label className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
            WBS Name
          </label>
          <input
            value={headerDraft.wbs_name ?? ""}
            onChange={(e) => updateHeader("wbs_name", e.target.value)}
            disabled={!plan}
            className="rounded border border-gray-600 bg-[#1a2233] text-white text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[170px] disabled:opacity-40"
          />
        </div>

        {/* Start Date */}
        <div className="flex flex-col">
          <label className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
            Start Date
          </label>
          <input
            type="date"
            value={headerDraft.start_date ?? ""}
            onChange={(e) => updateHeader("start_date", e.target.value)}
            disabled={!plan}
            className="rounded border border-gray-600 bg-[#1a2233] text-white text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40"
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col">
          <label className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
            End Date
          </label>
          <input
            type="date"
            value={headerDraft.end_date ?? ""}
            onChange={(e) => updateHeader("end_date", e.target.value)}
            disabled={!plan}
            className="rounded border border-gray-600 bg-[#1a2233] text-white text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-40"
          />
        </div>

        <div className="flex gap-3 ml-auto">
          <button
            onClick={() => setShowNewPlan(true)}
            className="rounded border border-green-500 bg-[#1a2233] text-green-400 text-sm font-semibold px-3 py-2 hover:bg-[#243049] transition-colors whitespace-nowrap"
          >
            + New Plan
          </button>
          <button
            onClick={handleAddWorkstream}
            disabled={!plan}
            className="rounded border border-gray-500 bg-[#1a2233] text-white text-sm font-semibold px-4 py-2 hover:bg-[#243049] transition-colors whitespace-nowrap disabled:opacity-40"
          >
            + Add Workstream
          </button>
          <button className="rounded bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 hover:bg-yellow-300 transition-colors whitespace-nowrap">
            Publish to Sprint
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Scrollable left content */}
        <div className="flex-1 overflow-y-auto p-6 min-w-0">
          {!hasPlans && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-gray-500 text-lg mb-4">No WBS plans yet. Create your first one!</p>
              <button
                onClick={() => setShowNewPlan(true)}
                className="rounded-lg bg-blue-700 text-white font-semibold px-6 py-3 hover:bg-blue-800 transition-colors"
              >
                + Create New Plan
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400 text-sm">Loading plan…</div>
            </div>
          ) : plan ? (
            <>
              <SummaryCards workstreams={workstreams} allNodes={allNodes} />

              {/* Title bar */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {plan.client_name} — {plan.wbs_name}
                  </h1>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {plan.start_date ?? "—"} to {plan.end_date ?? "—"} • Monthly WBS
                  </div>
                </div>
                <button
                  onClick={handleAddWorkstream}
                  className="rounded-lg bg-blue-700 text-white text-sm font-semibold px-4 py-2 hover:bg-blue-800 transition-colors whitespace-nowrap"
                >
                  + Add Dynamic Workstream
                </button>
              </div>

              {/* Workstreams */}
              {workstreams.map((ws) => (
                <WorkstreamBlock
                  key={ws.id}
                  ws={ws}
                  allNodes={allNodes}
                  selectedId={selectedNodeId}
                  planId={activePlanId!}
                  onSelect={setSelectedNodeId}
                  onRefresh={() => mutatePlan()}
                />
              ))}

              {/* Create New Workstream CTA */}
              <button
                onClick={handleAddWorkstream}
                className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-white py-5 text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                + Create New Workstream
              </button>
            </>
          ) : null}
        </div>

        {/* Fixed right panel */}
        <div className="w-72 flex-shrink-0 border-l border-gray-200 overflow-y-auto bg-white">
          {plan && (
            <RightPanel
              selectedNode={selectedNode}
              users={users ?? []}
              workstreams={workstreams}
              allNodes={allNodes}
              planId={activePlanId!}
              clientId={plan.client_id ?? null}
              onRefresh={() => mutatePlan()}
              onDeselect={() => setSelectedNodeId(null)}
            />
          )}
        </div>
      </div>

      {/* New Plan Modal */}
      {showNewPlan && (
        <NewPlanModal
          clients={clients ?? []}
          onClose={() => setShowNewPlan(false)}
          onCreated={handlePlanCreated}
        />
      )}
    </div>
  )
}
