export type Vec3 = [number, number, number]

export interface CraneEntry {
  name: string
  position: Vec3
}

export interface PortZone {
  id: number
  name: string
  quay: Vec3
  cranes: CraneEntry[]
  road: Vec3
  yardHandover: Vec3
  yard: Vec3
}

export const PORT_ZONES: PortZone[] = [
  { id: 1, name: 'Zone 1', quay: [-43, 0.85, 480], cranes: [{ name: 'crane-berth-1-0', position: [-43, 0.85, 450] }, { name: 'crane-berth-1-1', position: [-43, 0.85, 470] }, { name: 'crane-berth-1-2', position: [-43, 0.85, 490] }, { name: 'crane-berth-1-3', position: [-43, 0.85, 510] }], road: [-25, 0.76, 480], yardHandover: [22, 0.75, 480], yard: [70, 0.75, 480] },
  { id: 2, name: 'Zone 2', quay: [-43, 0.85, 240], cranes: [{ name: 'crane-berth-2-0', position: [-43, 0.85, 210] }, { name: 'crane-berth-2-1', position: [-43, 0.85, 230] }, { name: 'crane-berth-2-2', position: [-43, 0.85, 250] }, { name: 'crane-berth-2-3', position: [-43, 0.85, 270] }], road: [-25, 0.76, 240], yardHandover: [22, 0.75, 240], yard: [70, 0.75, 240] },
  { id: 3, name: 'Zone 3', quay: [-43, 0.85, 0],   cranes: [{ name: 'crane-berth-3-0', position: [-43, 0.85, -30] }, { name: 'crane-berth-3-1', position: [-43, 0.85, -10] }, { name: 'crane-berth-3-2', position: [-43, 0.85, 10] },  { name: 'crane-berth-3-3', position: [-43, 0.85, 30] }],  road: [-25, 0.76, 0],   yardHandover: [22, 0.75, 0],   yard: [70, 0.75, 0] },
  { id: 4, name: 'Zone 4', quay: [-43, 0.85, -240], cranes: [{ name: 'crane-berth-4-0', position: [-43, 0.85, -270] }, { name: 'crane-berth-4-1', position: [-43, 0.85, -250] }, { name: 'crane-berth-4-2', position: [-43, 0.85, -230] }, { name: 'crane-berth-4-3', position: [-43, 0.85, -210] }], road: [-25, 0.76, -240], yardHandover: [22, 0.75, -240], yard: [70, 0.75, -240] },
  { id: 5, name: 'Zone 5', quay: [-43, 0.85, -480], cranes: [{ name: 'crane-berth-5-0', position: [-43, 0.85, -510] }, { name: 'crane-berth-5-1', position: [-43, 0.85, -490] }, { name: 'crane-berth-5-2', position: [-43, 0.85, -470] }, { name: 'crane-berth-5-3', position: [-43, 0.85, -450] }], road: [-25, 0.76, -480], yardHandover: [22, 0.75, -480], yard: [70, 0.75, -480] },
]
