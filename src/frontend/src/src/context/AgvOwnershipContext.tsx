import { createContext, useContext, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'

export type Owner = 'unload' | 'load' | 'vesselLate' | null

interface AgvOwnership {
  getOwner: (name: string) => Owner
  claim: (name: string, owner: Owner) => boolean
  release: (name: string, owner: Owner) => void
  getOriginalPosition: (name: string) => [number, number, number] | null
  saveOriginalPosition: (name: string, pos: [number, number, number]) => void
}

const AgvOwnershipContext = createContext<AgvOwnership>(null!)

export function AgvOwnershipProvider({ children }: { children: ReactNode }) {
  const owners = useRef<Map<string, Owner>>(new Map())
  const originalPositions = useRef<Map<string, [number, number, number]>>(new Map())

  const getOwner = useCallback((name: string) => owners.current.get(name) ?? null, [])

  const claim = useCallback((name: string, owner: Owner): boolean => {
    const current = owners.current.get(name)
    if (current && current !== owner) return false
    owners.current.set(name, owner)
    return true
  }, [])

  const release = useCallback((name: string, owner: Owner) => {
    if (owners.current.get(name) === owner) {
      owners.current.delete(name)
    }
  }, [])

  const saveOriginalPosition = useCallback((name: string, pos: [number, number, number]) => {
    if (!originalPositions.current.has(name)) {
      originalPositions.current.set(name, [...pos])
    }
  }, [])

  const getOriginalPosition = useCallback((name: string) => {
    return originalPositions.current.get(name) ?? null
  }, [])

  return (
    <AgvOwnershipContext.Provider value={{ getOwner, claim, release, getOriginalPosition, saveOriginalPosition }}>
      {children}
    </AgvOwnershipContext.Provider>
  )
}

export const useAgvOwnership = () => useContext(AgvOwnershipContext)
