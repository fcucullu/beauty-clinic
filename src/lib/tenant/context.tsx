'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Tenant } from '@/types/database'

interface TenantContextType {
  tenant: Tenant
}

const TenantContext = createContext<TenantContextType | null>(null)

export function TenantProvider({ tenant, children }: { tenant: Tenant; children: ReactNode }) {
  return (
    <TenantContext.Provider value={{ tenant }}>
      <style>{`
        :root {
          --color-primary: ${tenant.primary_color};
          --color-secondary: ${tenant.secondary_color};
          --color-accent: ${tenant.accent_color};
        }
      `}</style>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context.tenant
}
