'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, BadgeCheck, Blocks, ChevronRight, ShieldCheck } from 'lucide-react'
import { getBorrower, getCredentials, getLenders, getMandates, getChainEvents, getAdminOverview } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { useDemoStore } from '@/lib/store/demo-store'
import { StatCard, Skeletons, EmptyState, StatusBadge } from '@/components/shared/primitives'
import { CredentialCard, PermissionSlip, VerificationChecklist } from '@/components/shared/credit-components'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { BorrowerApp } from '@/components/borrower/borrower-app'
import { IssuerPortal } from '@/components/portals/issuer-portal'
import { LenderPortal } from '@/components/portals/lender-portal'
import { AdminPortal } from '@/components/portals/admin-portal'
import { ExplorerPortal } from '@/components/portals/explorer-portal'
import { AttackLabPortal } from '@/components/portals/attack-lab-portal'

const disclosureLabels: Record<string, string> = { kycStatus: 'KYC status', ageOver21: 'Age over 21', incomeThreshold: 'Income threshold', incomeBand: 'Income band', cashflowStability: 'Cashflow stability', employerName: 'Employer name', rawStatements: 'Raw statements', exactIncome: 'Exact income' }

const titles: Record<string, string> = {
  '/borrower': 'Your credit passport', '/borrower/onboarding': 'Set up your wallet', '/borrower/add-credential': 'Add a credential', '/borrower/assistant': 'Ask your loan assistant', '/borrower/activity': 'Consent activity', '/borrower/profile': 'Your profile',
  '/issuer/issuer-kyc': 'Issuer overview', '/issuer/issuer-kyc/subjects': 'Credential subjects', '/issue': 'Issue a credential', '/credentials': 'Issued credentials', '/status': 'Status lists', '/keys': 'Signing keys', '/activity': 'Issuer activity',
  '/lender/lender-a': 'Lending overview', '/requests': 'Borrower requests', '/requests/req-qr-4821': 'Request review', '/policy': 'Underwriting policy', '/issuers': 'Trusted issuers', '/offers': 'Loan offers', '/compliance': 'Compliance controls', '/settings': 'Workspace settings',
  '/admin': 'Trust network overview', '/admin/registry': 'Trusted registry', '/admin/queue': 'Review queue', '/admin/audit': 'Audit trail', '/explorer': 'Public trust explorer', '/lab': 'Attack Lab',
}

function titleFor(path: string) {
  if (titles[path]) return titles[path]
  if (path.startsWith('/borrower/credentials/')) return 'Credential details'
  if (path.startsWith('/borrower/mandates/')) return 'Mandate permissions'
  if (path.startsWith('/borrower/runs/')) return 'Agent run timeline'
  if (path.startsWith('/borrower/offers/')) return 'Compare loan offers'
  return titles[path.split('/').slice(0, 2).join('/')] ?? 'SANAD workspace'
}

export function RouteContent({ path }: { path: string }) {
  if (path.startsWith('/borrower')) return <BorrowerApp path={path} />
  if (isPortalIssuer(path)) return <IssuerPortal path={path} />
  if (isPortalLender(path)) return <LenderPortal path={path} />
  if (path.startsWith('/admin')) return <AdminPortal path={path} />
  if (path.startsWith('/explorer')) return <ExplorerPortal />
  if (path === '/lab') return <AttackLabPortal />
  return <PortalOverview path={path} />
}

function PortalOverview({ path }: { path: string }) {
  const personaId = useDemoStore((state) => state.personaId)
  const query = useQuery({ queryKey: ['portal-overview', personaId], queryFn: async () => {
    const [borrower, credentials, lenders, mandates, events, admin] = await Promise.all([getBorrower(personaId), getCredentials(personaId), getLenders(), getMandates(personaId), getChainEvents({ limit: 30 }), getAdminOverview()])
    return { borrower, credentials, lenders, mandates, events, admin }
  } })
  const heading = titleFor(path)
  const activeMandate = query.data?.mandates.find((mandate) => mandate.status === 'active')
  const isBorrower = path.startsWith('/borrower')
  const isAdmin = path.startsWith('/admin')
  const metrics = isBorrower ? [
    { label: 'Verified credentials', value: query.data?.credentials.filter((item) => item.status === 'active').length ?? 0, note: 'Held in your wallet', icon: <BadgeCheck className="size-4" /> },
    { label: 'Monthly income proof', value: formatINR(query.data?.borrower?.monthlyIncome ?? 0), note: 'Shared as a threshold, not a statement', icon: <Blocks className="size-4" /> },
    { label: 'Active permissions', value: query.data?.mandates.filter((item) => item.status === 'active').length ?? 0, note: 'You can revoke any time', icon: <ShieldCheck className="size-4" /> },
  ] : isAdmin ? [
    { label: 'Trusted issuers', value: query.data?.admin.issuers.filter((item) => item.registryStatus === 'active').length ?? 0, note: 'Governed by the registry', icon: <BadgeCheck className="size-4" /> },
    { label: 'Trusted lenders', value: query.data?.admin.lenders.filter((item) => item.status === 'active').length ?? 0, note: 'Policy-bound participants', icon: <Blocks className="size-4" /> },
    { label: 'Events indexed', value: query.data?.events.length ?? 0, note: 'Public testnet activity', icon: <ShieldCheck className="size-4" /> },
  ] : [
    { label: 'Trust events', value: query.data?.events.length ?? 0, note: 'Synthetic testnet activity', icon: <Blocks className="size-4" /> },
    { label: 'Verified identities', value: query.data?.credentials.filter((item) => item.status === 'active').length ?? 0, note: 'Proofs, not raw documents', icon: <BadgeCheck className="size-4" /> },
    { label: 'Network status', value: 'Healthy', note: 'Base Sepolia · testnet', icon: <ShieldCheck className="size-4" /> },
  ]
  return <div className="mx-auto max-w-5xl"><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"><span>SANAD</span><ChevronRight className="size-3" /><span>{path.split('/').filter(Boolean)[0] ?? 'portal'}</span></div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">A borrower-first trust layer for verifiable income, responsible lending and consent that travels with you.</p></div><StatusBadge status="onchain" label="Base Sepolia · testnet" /></div>{query.isLoading ? <Skeletons rows={3} /> : <><div className="grid gap-3 sm:grid-cols-3">{metrics.map((metric, index) => <StatCard key={metric.label} {...metric} accent={index === 2 ? 'violet' : 'teal'} />)}</div><div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">{isBorrower ? <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-sm">Your verified proofs</CardTitle><p className="mt-1 text-xs text-muted-foreground">Selective disclosure keeps your source data private.</p></div><Link href="/borrower/add-credential" className="text-xs font-medium text-primary">Add proof <ArrowUpRight className="ml-1 inline size-3" /></Link></CardHeader><CardContent className="grid gap-3">{query.data?.credentials.filter((item) => item.subjectId === personaId).slice(0, 3).map((credential) => <CredentialCard key={credential.id} credential={credential} issuerName={query.data.admin.issuers.find((item) => item.id === credential.issuerId)?.name} />)}{query.data?.credentials.length === 0 && <EmptyState title="No credentials yet" description="Start by requesting a verified credential from a trusted issuer." />}</CardContent></Card> : <Card><CardHeader><CardTitle className="text-sm">SANAD trust network</CardTitle><p className="text-xs text-muted-foreground">Explore a specific workspace to review credentials, lending requests, registry decisions, and public chain events.</p></CardHeader><CardContent className="grid gap-4"><div className="rounded-xl border border-border bg-background/50 p-4"><div className="flex items-center gap-2 text-xs font-medium"><ShieldCheck className="size-4 text-primary" />Selective disclosure by default</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Only purpose-bound claims and salted commitments are exposed. Personal data remains in the borrower wallet.</p></div><Link href={isAdmin ? '/admin/registry' : isPortalIssuer(path) ? '/issue' : isPortalLender(path) ? '/requests' : '/explorer'} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Explore this workspace <ArrowUpRight data-icon="inline-end" /></Link></CardContent></Card>}{isBorrower ? <div className="grid content-start gap-4">{activeMandate ? <PermissionSlip permissions={Object.entries(activeMandate.disclosures).map(([key, allowed]) => ({ label: disclosureLabels[key] ?? key, allowed }))} /> : <EmptyState title="No active mandate" description="When you sign a mandate, the agent can search only within your limits." />}<VerificationChecklist items={[{ label: 'KYC credential active', detail: query.data?.borrower?.kycStatus === 'verified' ? 'Issuer signature and status list are current' : 'Refresh your identity credential', passed: query.data?.borrower?.kycStatus === 'verified' }, { label: 'Income threshold verified', detail: `${formatINR(query.data?.borrower?.monthlyIncome ?? 0)} monthly · source details stay private`, passed: (query.data?.borrower?.monthlyIncome ?? 0) >= 25000 }]} /></div> : <Card><CardHeader><CardTitle className="text-sm">Cross-portal events</CardTitle></CardHeader><CardContent className="grid gap-2 text-xs text-muted-foreground"><p>Mandate signatures, credential revocations, lender requests, and registry decisions update shared portal state.</p><p>Current synthetic testnet network: <span className="text-foreground">{query.data?.admin.chainStatus.network}</span></p></CardContent></Card>}</div><div className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.035] px-4 py-3 text-xs text-muted-foreground"><span className="font-medium text-primary">Demo state</span> · JSON seed data flows through the mock API and shared store. Reset Demo restores the original records.</div></>}</div>
}

function isPortalIssuer(path: string) { return path.startsWith('/issuer') || ['/issue', '/credentials', '/status', '/keys', '/activity'].includes(path) }
function isPortalLender(path: string) { return path.startsWith('/lender') || path.startsWith('/requests/') || ['/requests', '/policy', '/issuers', '/offers', '/compliance', '/settings'].includes(path) }
