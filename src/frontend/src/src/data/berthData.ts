export type Vec3 = [number, number, number]

export interface Berth {
  id: number
  name: string
  quay: Vec3
  road: Vec3
  yard: Vec3
}

export const BERTHS: Berth[] = [
  { id: 1, name: 'Berth 1', quay: [-43, 0.85, 480], road: [-25, 0.76, 480], yard: [70, 0.75, 480] },
  { id: 2, name: 'Berth 2', quay: [-43, 0.85, 240], road: [-25, 0.76, 240], yard: [70, 0.75, 240] },
  { id: 3, name: 'Berth 3', quay: [-43, 0.85, 0],   road: [-25, 0.76, 0],   yard: [70, 0.75, 0] },
  { id: 4, name: 'Berth 4', quay: [-43, 0.85, -240], road: [-25, 0.76, -240], yard: [70, 0.75, -240] },
  { id: 5, name: 'Berth 5', quay: [-43, 0.85, -480], road: [-25, 0.76, -480], yard: [70, 0.75, -480] },
]
