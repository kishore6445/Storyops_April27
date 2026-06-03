import type { WBSNode, Workstream, NodeStatus } from "./data"

export function makeId(): number {
  return Date.now() + Math.floor(Math.random() * 10000)
}

export function getLeafNodes(nodes: WBSNode[]): WBSNode[] {
  let out: WBSNode[] = []
  for (const n of nodes) {
    if (!n.children.length) out.push(n)
    else out = out.concat(getLeafNodes(n.children))
  }
  return out
}

export function getWorkstreamLeafNodes(ws: Workstream): WBSNode[] {
  let out: WBSNode[] = []
  for (const n of ws.nodes) {
    if (!n.children.length) out.push(n)
    else out = out.concat(getLeafNodes(n.children))
  }
  return out
}

export function calcPct(ws: Workstream): number {
  const leaves = getWorkstreamLeafNodes(ws)
  if (!leaves.length) return 0
  return Math.round((leaves.filter((x) => x.status === "Done").length / leaves.length) * 100)
}

export function statusBadgeClass(status: NodeStatus): string {
  switch (status) {
    case "Done":
      return "bg-green-100 text-green-700 border border-green-300"
    case "Blocked":
      return "bg-red-100 text-red-700 border border-red-300"
    case "Waiting Client":
      return "bg-indigo-100 text-indigo-700 border border-indigo-300"
    case "In Progress":
      return "bg-amber-100 text-amber-700 border border-amber-300"
    case "Not Started":
    default:
      return "bg-gray-100 text-gray-600 border border-gray-300"
  }
}

export function findNodeById(
  id: number,
  nodes: WBSNode[]
): WBSNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findNodeById(id, n.children)
    if (found) return found
  }
  return null
}

export function updateNodeById(
  id: number,
  patch: Partial<WBSNode>,
  nodes: WBSNode[]
): WBSNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch }
    return { ...n, children: updateNodeById(id, patch, n.children) }
  })
}

export function addChildToNode(
  parentId: number,
  child: WBSNode,
  nodes: WBSNode[]
): WBSNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) return { ...n, children: [...n.children, child] }
    return { ...n, children: addChildToNode(parentId, child, n.children) }
  })
}

export function addSiblingAfterNode(
  siblingId: number,
  newNode: WBSNode,
  nodes: WBSNode[]
): WBSNode[] {
  const idx = nodes.findIndex((n) => n.id === siblingId)
  if (idx !== -1) {
    const result = [...nodes]
    result.splice(idx + 1, 0, newNode)
    return result
  }
  return nodes.map((n) => ({
    ...n,
    children: addSiblingAfterNode(siblingId, newNode, n.children),
  }))
}

export function deleteNodeById(id: number, nodes: WBSNode[]): WBSNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => ({ ...n, children: deleteNodeById(id, n.children) }))
}

export function getAllBottlenecks(workstreams: Workstream[]): { title: string; path: string; status: NodeStatus; assignee: string }[] {
  const result: { title: string; path: string; status: NodeStatus; assignee: string }[] = []
  for (const ws of workstreams) {
    collectBottlenecks(ws.nodes, ws.title, result)
  }
  return result
}

function collectBottlenecks(
  nodes: WBSNode[],
  path: string,
  result: { title: string; path: string; status: NodeStatus; assignee: string }[]
) {
  for (const n of nodes) {
    if (n.status === "Blocked" || n.status === "Waiting Client") {
      result.push({ title: n.title, path, status: n.status, assignee: n.assignee })
    }
    collectBottlenecks(n.children, `${path} → ${n.title}`, result)
  }
}
