'use client'

import Link from 'next/link'
import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Blocks, Building2, ChevronRight, Compass, FlaskConical, Landmark, LayoutDashboard, ShieldCheck, WalletCards } from 'lucide-react'
import { useDemoStore } from '@/lib/store/demo-store'
import { getMessages } from '@/lib/i18n'
import { startChainFeed } from '@/lib/sim/chainFeed'
import { DemoPanel } from './demo-panel'
import { EntitySwitcher, LanguageToggle, RoleSwitcher } from './topbar-controls'

type PortalKind = 'borrower' | 'issuer' | 'lender' | 'admin' | 'explorer' | 'lab' | 'design'
type NavItem = { label: string; href: string }

const navigation: Record<PortalKind, NavItem[]> = {
  borrower: [
    { label: 'Passport', href: '/borrower' }, { label: 'Onboarding', href: '/borrower/onboarding' }, { label: 'Credentials', href: '/borrower/credentials/cred-robin-income' }, { label: 'Add credential', href: '/borrower/add-credential' }, { label: 'Assistant', href: '/borrower/assistant' }, { label: 'Mandate', href: '/borrower/mandates/mandate-robin-active' }, { label: 'Run history', href: '/borrower/runs/run-robin' }, { label: 'Offers', href: '/borrower/offers/run-robin' }, { label: 'Activity', href: '/borrower/activity' }, { label: 'Profile', href: '/borrower/profile' },
  ],
  issuer: [{ label: 'Overview', href: '/issuer/issuer-kyc' }, { label: 'Subjects', href: '/issuer/issuer-kyc/subjects' }, { label: 'Issue credential', href: '/issue' }, { label: 'Credentials', href: '/credentials' }, { label: 'Status lists', href: '/status' }, { label: 'Signing keys', href: '/keys' }, { label: 'Activity', href: '/activity' }],
  lender: [{ label: 'Overview', href: '/lender/lender-a' }, { label: 'Requests', href: '/requests' }, { label: 'Request detail', href: '/requests/req-qr-4821' }, { label: 'Policy', href: '/policy' }, { label: 'Trusted issuers', href: '/issuers' }, { label: 'Offers', href: '/offers' }, { label: 'Compliance', href: '/compliance' }, { label: 'Settings', href: '/settings' }],
  admin: [{ label: 'Overview', href: '/admin' }, { label: 'Registry', href: '/admin/registry' }, { label: 'Review queue', href: '/admin/queue' }, { label: 'Audit log', href: '/admin/audit' }],
  explorer: [{ label: 'Explorer', href: '/explorer' }, { label: 'Design system', href: '/design' }],
  lab: [{ label: 'Attack Lab', href: '/lab' }, { label: 'Public explorer', href: '/explorer' }, { label: 'Design system', href: '/design' }],
  design: [{ label: 'Component gallery', href: '/design' }, { label: 'Public explorer', href: '/explorer' }],
}

const portalTitles: Record<PortalKind, string> = { borrower: 'Borrower passport', issuer: 'Issuer portal', lender: 'Lender workspace', admin: 'Trust administration', explorer: 'Public trust explorer', lab: 'Safety test lab', design: 'Design system' }
const icons: Record<PortalKind, typeof WalletCards> = { borrower: WalletCards, issuer: Building2, lender: Landmark, admin: LayoutDashboard, explorer: Compass, lab: FlaskConical, design: Blocks }

function resolveKind(path: string): PortalKind {
  if (path.startsWith('/issuer') || ['/issue', '/credentials', '/status', '/keys', '/activity'].includes(path)) return 'issuer'
  if (path.startsWith('/lender') || path.startsWith('/requests/') || ['/requests', '/policy', '/issuers', '/offers', '/compliance', '/settings'].includes(path)) return 'lender'
  if (path.startsWith('/admin')) return 'admin'
  if (path.startsWith('/explorer')) return 'explorer'
  if (path.startsWith('/lab')) return 'lab'
  if (path.startsWith('/design')) return 'design'
  return 'borrower'
}

function isActive(pathname: string, href: string) {
  const entityOverview = /^\/(issuer|lender)\/(issuer-[^/]+|lender-[^/]+)$/.test(href)
  return pathname === href || (!entityOverview && href !== '/borrower' && pathname.startsWith(`${href}/`))
}

function PortalLink({ item, active, compact = false }: { item: NavItem; active: boolean; compact?: boolean }) {
  return <Link href={item.href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'} ${compact ? 'whitespace-nowrap' : ''}`}><span>{item.label}</span>{active && <ChevronRight className="ml-auto size-3" />}</Link>
}

function TopBar({ kind, path }: { kind: PortalKind; path: string }) {
  const Icon = icons[kind]
  const title = portalTitles[kind]
  return <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl sm:px-6"><div className="flex min-w-0 items-center gap-3"><Link href="/" aria-label="SANAD home" className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-background"><ShieldCheck className="size-4" /></Link><span className="hidden text-[10px] font-semibold tracking-[0.18em] text-foreground/90 sm:inline">SANAD</span><span className="hidden h-5 w-px bg-border sm:block" /><span className="flex min-w-0 items-center gap-2 text-xs font-medium"><Icon className="size-4 shrink-0 text-primary" /><span className="truncate">{title}</span></span></div><div className="flex shrink-0 items-center gap-1"><>{(kind === 'issuer' || kind === 'lender') && <EntitySwitcher kind={kind} path={path} />}<RoleSwitcher /><LanguageToggle /><button type="button" aria-label="Notifications" className="relative grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"><Bell className="size-4" /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" /></button></></div></header>
}

function PortalFooter() {
  return <footer className="border-t border-border/70 px-5 py-5 text-center text-[10px] text-muted-foreground">Prototype. Synthetic data. Testnet only.</footer>
}

function BorrowerFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const language = useDemoStore((state) => state.language)
  const messages = getMessages(language)
  const tabs = [{ label: messages.nav.passport, href: '/borrower', icon: WalletCards }, { label: messages.nav.assistant, href: '/borrower/assistant', icon: Blocks }, { label: messages.nav.activity, href: '/borrower/activity', icon: Compass }, { label: messages.nav.profile, href: '/borrower/profile', icon: Building2 }]
  return <div className="min-h-screen bg-background px-0 py-0 sm:px-4 sm:py-4"><div className="mx-auto flex h-screen w-full max-w-[430px] flex-col overflow-hidden border-x border-border bg-background shadow-2xl shadow-black/30 sm:h-[calc(100vh-2rem)] sm:rounded-[30px] sm:border"><header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-xl"><Link href="/borrower" className="flex items-center gap-2" aria-label="SANAD passport"><span className="grid size-8 place-items-center rounded-xl bg-primary text-background"><ShieldCheck className="size-4" /></span><span className="text-xs font-semibold tracking-[0.18em]">SANAD</span><span className="ml-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[9px] text-primary">{messages.nav.passport}</span></Link><div className="flex items-center gap-1"><LanguageToggle /><RoleSwitcher /></div></header><main id="borrower-main" className="min-h-0 flex-1 overflow-y-auto px-4 py-5">{children}<DemoPanel key={pathname} inline /><PortalFooter /></main><nav aria-label="Primary navigation" className="z-20 grid shrink-0 grid-cols-4 border-t border-border bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">{tabs.map((tab) => { const Icon = tab.icon; const active = isActive(pathname, tab.href); return <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[9px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${active ? 'text-primary' : 'text-muted-foreground'}`}><Icon className="size-4" />{tab.label}</Link> })}</nav></div></div>
}

function navigationFor(path: string, kind: PortalKind) {
  if (kind === 'issuer') {
    const issuerId = path.startsWith('/issuer/') ? path.split('/')[2] : 'issuer-kyc'
    return [{ label: 'Overview', href: `/issuer/${issuerId}` }, { label: 'Subjects', href: `/issuer/${issuerId}/subjects` }, { label: 'Issue credential', href: `/issuer/${issuerId}/issue` }, { label: 'Credentials', href: `/issuer/${issuerId}/credentials` }, { label: 'Status list', href: `/issuer/${issuerId}/status` }, { label: 'Keys and DID', href: `/issuer/${issuerId}/keys` }, { label: 'Activity', href: `/issuer/${issuerId}/activity` }]
  }
  if (kind === 'lender') {
    const lenderId = path.startsWith('/lender/') ? path.split('/')[2] : 'lender-a'
    return [{ label: 'Overview', href: `/lender/${lenderId}` }, { label: 'Requests', href: `/lender/${lenderId}/requests` }, { label: 'Policy', href: `/lender/${lenderId}/policy` }, { label: 'Trusted issuers', href: `/lender/${lenderId}/issuers` }, { label: 'Offers', href: `/lender/${lenderId}/offers` }, { label: 'Compliance', href: `/lender/${lenderId}/compliance` }, { label: 'Settings', href: `/lender/${lenderId}/settings` }]
  }
  return navigation[kind]
}

export function PortalShell({ path, children }: { path: string; children: ReactNode }) {
  const kind = resolveKind(path)
  const pathname = usePathname()
  const liveFeed = useDemoStore((state) => state.liveFeed)
  const Icon = icons[kind]
  useEffect(() => { if (!liveFeed) return; return startChainFeed() }, [liveFeed])
  if (kind === 'borrower') return <BorrowerFrame>{children}</BorrowerFrame>
  const items = navigationFor(path, kind)
  const fullBleed = kind === 'explorer' || kind === 'lab' || kind === 'design'
  return <div className="min-h-screen bg-background"><TopBar kind={kind} path={path} />{fullBleed ? <><nav aria-label={`${kind} navigation`} className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 py-3 sm:px-7">{items.map((item) => <PortalLink key={item.href} item={item} active={isActive(pathname, item.href)} compact />)}</nav><main className="mx-auto min-h-[calc(100vh-150px)] max-w-[1500px] px-4 py-6 pb-24 sm:px-7 sm:py-8">{children}<DemoPanel key={path} inline /></main><PortalFooter /></> : <div className="mx-auto grid max-w-[1500px] md:grid-cols-[220px_minmax(0,1fr)]"><aside className="sticky top-16 hidden h-[calc(100vh-4rem)] flex-col border-r border-border px-4 py-5 md:flex"><div className="flex items-center gap-2 px-3 pb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"><Icon className="size-4 text-primary" />{kind} workspace</div><nav aria-label={`${kind} workspace navigation`} className="grid gap-1">{items.map((item) => <PortalLink key={item.href} item={item} active={isActive(pathname, item.href)} />)}</nav><div className="mt-auto rounded-xl border border-border bg-surface p-3"><div className="flex items-center gap-2 text-[10px] font-medium"><span className="size-1.5 rounded-full bg-success" />Base Sepolia testnet</div><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Synthetic demo data · no real lending</p></div></aside><div className="min-w-0"><nav aria-label={`${kind} mobile navigation`} className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 md:hidden">{items.map((item) => <PortalLink key={item.href} item={item} active={isActive(pathname, item.href)} compact />)}</nav><main className="min-h-[calc(100vh-150px)] px-4 py-6 pb-32 sm:px-6 sm:py-8">{children}<DemoPanel key={path} inline /></main><PortalFooter /></div></div>}</div>
}
