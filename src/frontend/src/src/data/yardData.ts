import type { Vec3 } from './berthData'

export interface Yard {
  id: number
  name: string
  center: Vec3
  road: Vec3
}

export const YARDS: Yard[] = [
  { id: 1, name: 'Yard 1', center: [70, 0.75, 480], road: [-25, 0.76, 480] },
  { id: 2, name: 'Yard 2', center: [70, 0.75, 240], road: [-25, 0.76, 240] },
  { id: 3, name: 'Yard 3', center: [70, 0.75, 0],   road: [-25, 0.76, 0] },
  { id: 4, name: 'Yard 4', center: [70, 0.75, -240], road: [-25, 0.76, -240] },
  { id: 5, name: 'Yard 5', center: [70, 0.75, -480], road: [-25, 0.76, -480] },
]
