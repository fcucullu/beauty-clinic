import { getTenant } from '@/lib/tenant/get-tenant'
import { TenantProvider } from '@/lib/tenant/context'
import { AdminSidebar } from '@/components/admin/sidebar'
import type { ReactNode } from 'react'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const tenant = await getTenant()

  return (
    <TenantProvider tenant={tenant}>
      <div className="min-h-screen bg-gray-50">
        <AdminSidebar />
        <main className="lg:pl-64">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </TenantProvider>
  )
}
