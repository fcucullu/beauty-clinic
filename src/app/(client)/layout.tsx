import { getTenant } from '@/lib/tenant/get-tenant'
import { TenantProvider } from '@/lib/tenant/context'
import { ClientBottomNav } from '@/components/client/bottom-nav'
import { InstallPrompt } from '@/components/shared/install-prompt'
import type { ReactNode } from 'react'

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenant()

  return (
    <TenantProvider tenant={tenant}>
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          {tenant.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm">
              {tenant.name.charAt(0)}
            </div>
          )}
          <span className="font-semibold text-gray-900">{tenant.name}</span>
        </header>
        <main className="px-4 py-4 max-w-lg mx-auto">
          {children}
        </main>
        <ClientBottomNav />
        <InstallPrompt />
      </div>
    </TenantProvider>
  )
}
