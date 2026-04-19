'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getMockAppData } from '@/lib/data/mock-app-data'
import type { AppData } from '@/types/app-data'

type AppDataContextValue = {
  data: AppData
  loading: boolean
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

export default function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => getMockAppData())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const response = await fetch('/api/app-data', { cache: 'no-store' })
        if (!response.ok) throw new Error('App data request failed')
        const nextData = await response.json() as AppData
        if (!cancelled) setData(nextData)
      } catch (error) {
        console.error('[AppDataProvider]', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(() => ({ data, loading }), [data, loading])

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider')
  }
  return context
}
