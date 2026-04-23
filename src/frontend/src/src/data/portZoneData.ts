export type Vec3 = [number, number, number]

export interface CraneEntry {
  name: string
  position: Vec3
}

export interface YardGrid {
  rows: number
  cols: number
  tiers: number
  cellSize: Vec3
  origin: Vec3
}

export interface PortZone {
  id: number
  name: string
  quay: Vec3
  cranes: CraneEntry[]
  road: Vec3
  yardHandover: Vec3
  yard: Vec3
  yardGrid: YardGrid
}

export function getYardCellPosition(grid: YardGrid, row: number, col: number, tier: number = 0): Vec3 {
  return [
    grid.origin[0] + row * grid.cellSize[0],
    grid.origin[1] + tier * grid.cellSize[1],
    grid.origin[2] + col * grid.cellSize[2],
  ]
}

// key: "zoneId-row-col-tier" → containerId
const yardOccupancy = new Map<string, string>()

function cellKey(zoneId: number, row: number, col: number, tier: number): string {
  return `${zoneId}-${row}-${col}-${tier}`
}

export interface PlaceResult {
  tier: number
  position: Vec3
}

export function placeContainer(zoneId: number, row: number, col: number, containerId: string): PlaceResult | null {
  const zone = PORT_ZONES.find((z) => z.id === zoneId)
  if (!zone) return null

  const { yardGrid } = zone
  if (row < 0 || row >= yardGrid.rows || col < 0 || col >= yardGrid.cols) return null

  for (let t = 0; t < yardGrid.tiers; t++) {
    const key = cellKey(zoneId, row, col, t)
    if (!yardOccupancy.has(key)) {
      yardOccupancy.set(key, containerId)
      return { tier: t, position: getYardCellPosition(yardGrid, row, col, t) }
    }
  }
  return null // stack full
}

export function getStackHeight(zoneId: number, row: number, col: number): number {
  const zone = PORT_ZONES.find((z) => z.id === zoneId)
  if (!zone) return 0
  for (let t = zone.yardGrid.tiers - 1; t >= 0; t--) {
    if (yardOccupancy.has(cellKey(zoneId, row, col, t))) return t + 1
  }
  return 0
}

export function isYardFull(zoneId: number): boolean {
  const zone = PORT_ZONES.find((z) => z.id === zoneId)
  if (!zone) return true
  const { rows, cols, tiers } = zone.yardGrid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (let t = 0; t < tiers; t++) {
        if (!yardOccupancy.has(cellKey(zoneId, r, c, t))) return false
      }
    }
  }
  return true
}

export function findNextAvailableSlots(zoneId: number, count: number): ({ row: number; col: number } | null)[] {
  const zone = PORT_ZONES.find((z) => z.id === zoneId)
  if (!zone) return Array(count).fill(null)
  const { rows, cols, tiers } = zone.yardGrid

  // Build list of all cells with their current height
  const cells: { row: number; col: number; height: number }[] = []
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const h = getStackHeight(zoneId, r, c)
      if (h < tiers) cells.push({ row: r, col: c, height: h })
    }
  }
  // Sort by height ascending — spread across cells before stacking
  cells.sort((a, b) => a.height - b.height)

  const results: ({ row: number; col: number } | null)[] = []
  const used = new Set<number>() // indices into cells already picked this batch
  for (let n = 0; n < count; n++) {
    let picked = false
    for (let ci = 0; ci < cells.length; ci++) {
      if (!used.has(ci)) {
        results.push({ row: cells[ci].row, col: cells[ci].col })
        used.add(ci)
        picked = true
        break
      }
    }
    if (!picked) results.push(null)
  }
  return results
}

export function clearZoneContainers(zoneId: number): void {
  const keysToDelete: string[] = []
  for (const key of yardOccupancy.keys()) {
    if (key.startsWith(`${zoneId}-`)) keysToDelete.push(key)
  }
  for (const key of keysToDelete) {
    yardOccupancy.delete(key)
  }
}

const YARD_GRID_DEFAULTS: Omit<YardGrid, 'origin'> = {
  rows: 4,
  cols: 8,
  tiers: 6,
  cellSize: [15, 3, 14],
}

export const PORT_ZONES: PortZone[] = [
  { id: 1, name: 'Zone 1', quay: [-43, 0.85, 480], cranes: [{ name: 'crane-berth-1-0', position: [-43, 0.85, 450] }, { name: 'crane-berth-1-1', position: [-43, 0.85, 470] }, { name: 'crane-berth-1-2', position: [-43, 0.85, 490] }, { name: 'crane-berth-1-3', position: [-43, 0.85, 510] }], road: [-25, 0.76, 480], yardHandover: [22, 0.75, 480], yard: [70, 0.75, 480], yardGrid: { ...YARD_GRID_DEFAULTS, origin: [40, 0.75, 428] } },
  { id: 2, name: 'Zone 2', quay: [-43, 0.85, 240], cranes: [{ name: 'crane-berth-2-0', position: [-43, 0.85, 210] }, { name: 'crane-berth-2-1', position: [-43, 0.85, 230] }, { name: 'crane-berth-2-2', position: [-43, 0.85, 250] }, { name: 'crane-berth-2-3', position: [-43, 0.85, 270] }], road: [-25, 0.76, 240], yardHandover: [22, 0.75, 240], yard: [70, 0.75, 240], yardGrid: { ...YARD_GRID_DEFAULTS, origin: [40, 0.75, 188] } },
  { id: 3, name: 'Zone 3', quay: [-43, 0.85, 0],   cranes: [{ name: 'crane-berth-3-0', position: [-43, 0.85, -30] }, { name: 'crane-berth-3-1', position: [-43, 0.85, -10] }, { name: 'crane-berth-3-2', position: [-43, 0.85, 10] },  { name: 'crane-berth-3-3', position: [-43, 0.85, 30] }],  road: [-25, 0.76, 0],   yardHandover: [22, 0.75, 0],   yard: [70, 0.75, 0],   yardGrid: { ...YARD_GRID_DEFAULTS, origin: [40, 0.75, -52] } },
  { id: 4, name: 'Zone 4', quay: [-43, 0.85, -240], cranes: [{ name: 'crane-berth-4-0', position: [-43, 0.85, -270] }, { name: 'crane-berth-4-1', position: [-43, 0.85, -250] }, { name: 'crane-berth-4-2', position: [-43, 0.85, -230] }, { name: 'crane-berth-4-3', position: [-43, 0.85, -210] }], road: [-25, 0.76, -240], yardHandover: [22, 0.75, -240], yard: [70, 0.75, -240], yardGrid: { ...YARD_GRID_DEFAULTS, origin: [40, 0.75, -292] } },
  { id: 5, name: 'Zone 5', quay: [-43, 0.85, -480], cranes: [{ name: 'crane-berth-5-0', position: [-43, 0.85, -510] }, { name: 'crane-berth-5-1', position: [-43, 0.85, -490] }, { name: 'crane-berth-5-2', position: [-43, 0.85, -470] }, { name: 'crane-berth-5-3', position: [-43, 0.85, -450] }], road: [-25, 0.76, -480], yardHandover: [22, 0.75, -480], yard: [70, 0.75, -480], yardGrid: { ...YARD_GRID_DEFAULTS, origin: [40, 0.75, -532] } },
]
