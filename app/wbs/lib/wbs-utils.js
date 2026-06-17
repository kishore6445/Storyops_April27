export const makeId = () =>
  Date.now() + Math.floor(Math.random() * 10000)

export const flatten = (items, parent = null, root = null) => {
  let out = []

  items.forEach((item) => {
    out.push({
      ...item,
      parentTitle: parent,
      rootTitle: root || item.title,
    })

    if (item.children?.length) {
      out = out.concat(
        flatten(
          item.children,
          item.title,
          root || item.title
        )
      )
    }
  })

  return out
}

export const leafItems = (items) => {
  let out = []

  items.forEach((item) => {
    if (!item.children?.length) {
      out.push(item)
    } else {
      out = out.concat(leafItems(item.children))
    }
  })

  return out
}

export const findItem = (id, list) => {
  for (const item of list) {
    if (item.id === id) return item

    const found = findItem(id, item.children || [])

    if (found) return found
  }

  return null
}

export const findParent = (
  id,
  list,
  parent = null
) => {
  for (const item of list) {
    if (item.id === id) return parent

    const found = findParent(
      id,
      item.children || [],
      item
    )

    if (found) return found
  }

  return null
}

export const statusClass = (status) => {
  switch (status) {
    case "Done":
      return "bg-green-100 text-green-700"

    case "Blocked":
      return "bg-red-100 text-red-700"

    case "Waiting Client":
      return "bg-indigo-100 text-indigo-700"

    case "In Progress":
      return "bg-amber-100 text-amber-700"

    default:
      return "bg-gray-100 text-gray-700"
  }
}

export const pct = (item) => {
  const leaves = leafItems([item])

  if (!leaves.length) {
    return item.status === "Done"
      ? 100
      : 0
  }

  return Math.round(
    (leaves.filter(
      (x) => x.status === "Done"
    ).length /
      leaves.length) *
      100
  )
}