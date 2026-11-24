'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useDemoStore } from '@/lib/store/demo-store'
import { Button } from '@/components/ui/button'

const roleRoutes = { Borrower: '/borrower', Issuer: '/issuer/issuer-kyc', Lender: '/lender/lender-a', 'Trust Admin': '/admin', Explorer: '/explorer', 'Attack Lab': '/lab' }
const coreIssuerIds = new Set(['issuer-kyc', 'issuer-gig', 'issuer-aa'])

export function RoleSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const role = pathname.startsWith('/issuer') || ['/issue', '/credentials', '/status', '/keys', '/activity'].includes(pathname) ? 'Issuer' : pathname.startsWith('/lender') || pathname.startsWith('/requests/') || ['/requests', '/policy', '/issuers', '/offers', '/compliance', '/settings'].includes(pathname) ? 'Lender' : pathname.startsWith('/admin') ? 'Trust Admin' : pathname.startsWith('/explorer') ? 'Explorer' : pathname.startsWith('/lab') ? 'Attack Lab' : 'Borrower'
  return <label><span className="sr-only">Switch portal</span><select aria-label="Switch portal" value={role} onChange={(event) => router.push(roleRoutes[event.target.value as keyof typeof roleRoutes])} className="h-8 max-w-28 rounded-lg border border-border bg-surface px-2 text-[11px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"><option>Borrower</option><option>Issuer</option><option>Lender</option><option>Trust Admin</option><option>Explorer</option><option>Attack Lab</option></select></label>
}

export function EntitySwitcher({ kind, path }: { kind: 'issuer' | 'lender'; path: string }) {
  const router = useRouter()
  const issuers = useDemoStore((state) => state.issuers)
  const lenders = useDemoStore((state) => state.lenders)
  const issuerId = path.startsWith('/issuer/') ? path.split('/')[2] : 'issuer-kyc'
  const lenderId = path.startsWith('/lender/') ? path.split('/')[2] : 'lender-a'
  const entities = kind === 'issuer'
    ? issuers.filter((issuer) => coreIssuerIds.has(issuer.id) && (issuer.registryStatus === 'active' || issuer.id === issuerId)).map((issuer) => ({ id: issuer.id, name: issuer.name }))
    : lenders.filter((lender) => lender.status === 'active' || lender.id === lenderId).map((lender) => ({ id: lender.id, name: lender.name }))
  const selectedId = kind === 'issuer' ? issuerId : lenderId
  function switchEntity(id: string) {
    if (path.startsWith(`/${kind}/`)) {
      const parts = path.split('/')
      parts[2] = id
      router.push(parts.join('/'))
      return
    }
    const issuerLegacy: Record<string, string> = { '/issue': 'issue', '/credentials': 'credentials', '/status': 'status', '/keys': 'keys', '/activity': 'activity' }
    const lenderLegacy: Record<string, string> = { '/requests': 'requests', '/policy': 'policy', '/issuers': 'issuers', '/offers': 'offers', '/compliance': 'compliance', '/settings': 'settings' }
    const legacySection = kind === 'issuer' ? issuerLegacy[path] : lenderLegacy[path]
    if (kind === 'lender' && path.startsWith('/requests/')) {
      router.push(`/lender/${id}/requests/${path.slice('/requests/'.length)}`)
      return
    }
    router.push(`/${kind}/${id}${legacySection ? `/${legacySection}` : ''}`)
  }
  return <label className="hidden items-center gap-1.5 sm:flex"><span className="sr-only">Switch {kind} entity</span><select aria-label={`Switch ${kind} entity`} value={entities.some((entity) => entity.id === selectedId) ? selectedId : entities[0]?.id} onChange={(event) => switchEntity(event.target.value)} className="h-8 max-w-40 rounded-lg border border-border bg-surface px-2 text-[10px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary">{entities.map((entity) => <option key={entity.id} value={entity.id}>{entity.name}</option>)}</select></label>
}

export function LanguageToggle() {
  const language = useDemoStore((state) => state.language)
  const setLanguage = useDemoStore((state) => state.setLanguage)
  const hasHydrated = useDemoStore((state) => state.hasHydrated)
  return <Button variant="ghost" size="sm" aria-label="Toggle language between English and Hindi" disabled={!hasHydrated} onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')} className="font-mono text-xs">{hasHydrated ? language === 'en' ? 'EN' : 'हि' : '···'}</Button>
}
