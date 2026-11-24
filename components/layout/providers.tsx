'use client'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { useDemoStore } from '@/lib/store/demo-store'
import { ChainDetailsDrawer } from '@/components/shared/chain-details-drawer'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false } } }))
  useEffect(() => { void useDemoStore.persist.rehydrate() }, [])
  return <QueryClientProvider client={queryClient}><TooltipProvider>{children}<ChainDetailsDrawer /><Toaster position="top-right" richColors /></TooltipProvider></QueryClientProvider>
}
