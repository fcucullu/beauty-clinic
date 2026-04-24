'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Check if on mobile and not installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) setShowPrompt(false)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!showPrompt) return null

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-40 animate-in slide-in-from-bottom">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm">Instala la app</p>
          <p className="text-xs text-gray-500">Accede mas rapido y recibe notificaciones</p>
        </div>
        <Button size="sm" onClick={handleInstall}>Instalar</Button>
        <button onClick={() => setShowPrompt(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
      </div>
    </div>
  )
}
