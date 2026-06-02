// Utility for WBS progress calculations

interface WBSItem {
  id: string
  parent_id: string | null
  progress_percentage: number
  children?: WBSItem[]
}

/**
 * Calculate progress for a WBS item based on its children
 * If the item has children, progress = average of children's progress
 * If the item has no children (leaf node), return its own progress
 */
export function calculateItemProgress(item: WBSItem, allItems: WBSItem[]): number {
  const children = allItems.filter((i) => i.parent_id === item.id)

  if (children.length === 0) {
    // Leaf node: use its own progress
    return item.progress_percentage
  }

  // Parent node: calculate from children
  const childProgress = children.map((child) => calculateItemProgress(child, allItems))
  return Math.round(childProgress.reduce((a, b) => a + b, 0) / children.length)
}

/**
 * Recursively update progress for an item and all its ancestors
 */
export function updateAncestorProgress(
  itemId: string,
  allItems: WBSItem[],
  itemMap: Map<string, WBSItem>
): Map<string, number> {
  const progressMap = new Map<string, number>()

  const item = itemMap.get(itemId)
  if (!item) return progressMap

  // Start from the item and work up the tree
  let currentId: string | null = itemId

  while (currentId) {
    const current = itemMap.get(currentId)
    if (!current) break

    const progress = calculateItemProgress(current, allItems)
    progressMap.set(currentId, progress)

    currentId = current.parent_id
  }

  return progressMap
}

/**
 * Flatten a tree structure and build an item map
 */
export function flattenWBSTree(
  items: WBSItem[]
): { flat: WBSItem[]; map: Map<string, WBSItem> } {
  const flat: WBSItem[] = []
  const map = new Map<string, WBSItem>()

  const traverse = (node: WBSItem) => {
    flat.push(node)
    map.set(node.id, node)
    if (node.children) {
      node.children.forEach(traverse)
    }
  }

  items.forEach(traverse)
  return { flat, map }
}
