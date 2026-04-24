'use client'

import { Card, CardContent } from '@/components/ui/card'

export default function MyPlansPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Mis Planes</h1>
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-400">Proximamente podras ver y gestionar tus planes aqui</p>
        </CardContent>
      </Card>
    </div>
  )
}
