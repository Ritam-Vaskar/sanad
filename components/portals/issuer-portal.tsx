'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import { ArrowRight, BadgeCheck, Check, Clock3, Download, FileKey2, FilePlus2, KeyRound, LoaderCircle, LockKeyhole, ShieldCheck, X } from 'lucide-react'
import type { Borrower, Claim, Credential, Issuer } from '@/types'
import { getAuditLog, getBorrowers, getChainEvents, getCredentials, getIssuers, issueCredential, revokeCredential } from '@/lib/api/mock-api'
import { formatDate, formatINR } from '@/lib/format'
import { downloadCsvFile } from '@/lib/download'
import { useDemoStore } from '@/lib/store/demo-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge, StatCard, HashChip, TxChip, JsonViewer, BitmapGrid, EmptyState } from '@/components/shared/primitives'
import { ConfirmDialog, DataTable } from '@/components/shared/overlays'
import { PortalHeading, PortalQueryState, SectionHeading } from './portal-shared'
import { IssuanceAreaChart } from './portal-charts'

const credentialNames: Record<Credential['type'], string> = { KycCredential: 'Identity verified', GigIncomeCredential: 'Gig income proof', CashFlowCredential: 'Cashflow stability' }
const issuerTypes: Record<string, Credential['type']> = { 'issuer-kyc': 'KycCredential', 'issuer-gig': 'GigIncomeCredential', 'issuer-aa': 'CashFlowCredential' }
const typeDescriptions: Record<Credential['type'], string> = { KycCredential: 'Verified identity and age claims', GigIncomeCredential: 'Income threshold and earning history', CashFlowCredential: 'Income band, activity, and cashflow consistency' }
const legacySections: Record<string, string> = { '/issue': 'issue', '/credentials': 'credentials', '/status': 'status', '/keys': 'keys', '/activity': 'activity' }

function issuerRoute(path: string) {
  if (legacySections[path]) return { issuerId: 'issuer-kyc', section: legacySections[path] }
  const [, , issuerId, section = 'overview'] = path.split('/')
  return { issuerId: issuerId || 'issuer-kyc', section }
}

function displayAlias(borrower: Borrower) {
  return `Borrower #${borrower.id.toUpperCase().slice(0, 4)}`
}

function eligibilityFor(type: Credential['type'], borrower: Borrower) {
  if (type === 'KycCredential') return { eligible: borrower.kycStatus === 'verified' && borrower.age >= 18, text: borrower.kycStatus === 'verified' && borrower.age >= 18 ? `Eligible: verified identity and age ${borrower.age} meet the issuer checks` : 'Not eligible: identity or age verification is incomplete' }
  if (type === 'GigIncomeCredential') return { eligible: borrower.monthlyIncome >= 25000, text: borrower.monthlyIncome >= 25000 ? `Eligible: verified income ${formatINR(borrower.monthlyIncome)} is at least ${formatINR(25000)}` : `Not eligible: verified income ${formatINR(borrower.monthlyIncome)} is below ${formatINR(25000)}` }
  return { eligible: !borrower.riskFlag, text: borrower.riskFlag ? 'Not eligible: a risk indicator requires provider review' : `Eligible: verified income ${formatINR(borrower.monthlyIncome)} has no open risk flag` }
}

function claimsFor(type: Credential['type'], borrower: Borrower): Claim[] {
  if (type === 'KycCredential') return [
    { key: 'kycStatus', label: 'Identity check', value: 'Verified', disclosable: true, sharedByDefault: true, sensitive: false },
    { key: 'ageOver21', label: 'Age 21+', value: borrower.age >= 21, disclosable: true, sharedByDefault: true, sensitive: false },
    { key: 'verificationLevel', label: 'Verification level', value: 'Document and selfie check', disclosable: true, sharedByDefault: false, sensitive: false },
  ]
  if (type === 'GigIncomeCredential') return [
    { key: 'incomeThreshold', label: 'Income at least ₹25,000', value: borrower.monthlyIncome >= 25000, disclosable: true, sharedByDefault: true, sensitive: false },
    { key: 'consecutiveMonths', label: 'Verified earning months', value: Number(borrower.notes.match(/(\d+) active months/)?.[1] ?? 6), disclosable: true, sharedByDefault: false, sensitive: false },
    { key: 'employerName', label: 'Employer name', value: 'Demo Gig Platform', disclosable: false, sharedByDefault: false, sensitive: true },
  ]
  const incomeBand = borrower.monthlyIncome < 25000 ? 'Below ₹25,000' : borrower.monthlyIncome >= 35000 ? '₹35,000+' : '₹25,000–₹35,000'
  const activeMonths = Number(borrower.notes.match(/(\d+)\s+(?:active\s+)?months/i)?.[1] ?? (/seasonal/i.test(borrower.notes) ? 4 : 6))
  const consistency = borrower.riskFlag ? 'Review needed' : /seasonal/i.test(borrower.notes) ? 'Variable' : 'Stable'
  return [
    { key: 'incomeBand', label: 'Income band', value: incomeBand, disclosable: true, sharedByDefault: false, sensitive: false },
    { key: 'activeMonths', label: 'Active income months', value: activeMonths, disclosable: true, sharedByDefault: false, sensitive: false },
    { key: 'consistency', label: 'Income consistency', value: consistency, disclosable: true, sharedByDefault: true, sensitive: false },
    { key: 'obligations', label: 'Existing monthly obligations', value: borrower.monthlyObligations ?? 0, disclosable: true, sharedByDefault: false, sensitive: false },
    { key: 'riskIndicators', label: 'High-risk indicators', value: Boolean(borrower.riskFlag), disclosable: true, sharedByDefault: false, sensitive: false },
    { key: 'inflows', label: 'Average monthly inflows', value: formatINR(borrower.monthlyIncome), disclosable: true, sharedByDefault: false, sensitive: true },
  ]
}

export function IssuerPortal({ path }: { path: string }) {
  const { issuerId, section } = issuerRoute(path)
  const personaId = useDemoStore((state) => state.personaId)
  const issuers = useDemoStore((state) => state.issuers)
  const borrowers = useDemoStore((state) => state.borrowers)
  const credentials = useDemoStore((state) => state.credentials)
  const statusLists = useDemoStore((state) => state.statusLists)
  const activity = useDemoStore((state) => state.activity)
  const chainEvents = useDemoStore((state) => state.chainEvents)
  const query = useQuery({ queryKey: ['issuer-portal', issuerId, personaId], queryFn: async () => {
    const [people, registry, currentProofs, audit, events] = await Promise.all([getBorrowers(), getIssuers(), getCredentials(personaId), getAuditLog(), getChainEvents({ limit: 40 })])
    return { people, registry, currentProofs, audit, events }
  } })
  const issuer = issuers.find((item) => item.id === issuerId)
  const credentialType = issuerTypes[issuerId] ?? 'KycCredential'
  const issuerCredentials = credentials.filter((credential) => credential.issuerId === issuerId)
  const heading = section === 'overview' ? 'Issuer overview' : section === 'subjects' ? 'Credential subjects' : section === 'issue' ? 'Issue a credential' : section === 'credentials' ? 'Issued credentials' : section === 'status' ? 'Status list' : section === 'keys' ? 'Keys and DID' : 'Issuer activity'
  return <PortalQueryState loading={query.isLoading} error={query.isError} retry={() => { void query.refetch() }}>
    {!issuer ? <EmptyState title="Issuer not found" description="Choose an active issuer from the entity selector to open its workspace." /> : <div className="grid gap-6">
      <PortalHeading eyebrow={`${issuer.name} · ${issuer.id}`} title={heading} description={section === 'issue' ? typeDescriptions[credentialType] : 'Issue portable, verifiable proofs while keeping borrower data under the borrower’s control.'} />
      {section === 'overview' && <IssuerOverview issuer={issuer} credentials={issuerCredentials} chainEvents={chainEvents} />}
      {section === 'subjects' && <SubjectsPage issuerId={issuerId} type={credentialType} borrowers={borrowers} credentials={credentials} />}
      {section === 'issue' && <IssueWizard issuer={issuer} type={credentialType} borrowers={borrowers} />}
      {section === 'credentials' && <CredentialsPage credentials={issuerCredentials} />}
      {section === 'status' && <StatusListPage issuer={issuer} credentials={issuerCredentials} list={statusLists.find((item) => item.issuerId === issuerId)} />}
      {section === 'keys' && <KeysPage issuer={issuer} />}
      {section === 'activity' && <ActivityPage issuer={issuer} credentials={issuerCredentials} activity={activity} chainEvents={chainEvents} />}
    </div>}
  </PortalQueryState>
}

function IssuerOverview({ issuer, credentials, chainEvents }: { issuer: Issuer; credentials: Credential[]; chainEvents: ReturnType<typeof useDemoStore.getState>['chainEvents'] }) {
  const active = credentials.filter((credential) => credential.status === 'active').length
  const revoked = credentials.filter((credential) => credential.status === 'revoked').length
  const [now] = useState(() => Date.now())
  const inThirtyDays = now + 30 * 86400000
  const expiring = credentials.filter((credential) => credential.status === 'active' && Date.parse(credential.validUntil) <= inThirtyDays).length
  const recent = [...credentials].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)).slice(0, 5)
  const relevantEvents = chainEvents.filter((event) => event.decoded.issuerId === issuer.id).slice(0, 4)
  return <div className="grid gap-5">
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${issuer.registryStatus === 'active' ? 'border-success/20 bg-success/[0.06]' : 'border-danger/25 bg-danger/[0.06]'}`}><div className="flex items-center gap-2 text-sm font-medium"><span className={`grid size-8 place-items-center rounded-lg ${issuer.registryStatus === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}><ShieldCheck className="size-4" /></span>{issuer.registryStatus === 'active' ? 'Active in SanadTrustRegistry' : 'Inactive in SanadTrustRegistry'}</div><StatusBadge status={issuer.registryStatus} /></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Issued" value={credentials.length} icon={<FilePlus2 />} /><StatCard label="Active" value={active} icon={<BadgeCheck />} accent="teal" /><StatCard label="Revoked" value={revoked} icon={<X />} accent="amber" /><StatCard label="Expiring in 30 days" value={expiring} icon={<Clock3 />} accent="violet" /></div>
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]"><Card><CardHeader><CardTitle className="text-sm">Issuance over time</CardTitle><CardDescription>Credential signing activity across the last six months.</CardDescription></CardHeader><CardContent><IssuanceAreaChart /></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Recent activity</CardTitle><CardDescription>Latest proofs and registry roots from this issuer.</CardDescription></CardHeader><CardContent className="grid gap-3">{recent.length === 0 && relevantEvents.length === 0 ? <EmptyState title="No activity yet" description="Issued proofs and status updates will appear here." /> : <>{recent.map((credential) => <div key={credential.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/40 px-3 py-2.5"><div className="min-w-0"><p className="truncate text-xs font-medium">{credentialNames[credential.type]} · {displayAliasFromId(credential.subjectId)}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatDate(credential.issuedAt, 'd MMM, HH:mm')}</p></div><StatusBadge status={credential.status} /></div>)}{relevantEvents.map((event) => <div key={event.id} className="flex items-center justify-between gap-3 border-t border-border/70 pt-2 text-xs"><span className="truncate">{event.type}</span><TxChip value={event.txHash} block={event.block} /></div>)}</>}</CardContent></Card></div>
  </div>
}

function displayAliasFromId(subjectId: string) {
  return `Borrower #${subjectId.toUpperCase().slice(0, 4)}`
}

function SubjectsPage({ issuerId, type, borrowers, credentials }: { issuerId: string; type: Credential['type']; borrowers: Borrower[]; credentials: Credential[] }) {
  const rows = borrowers.map((borrower) => {
    const eligibility = eligibilityFor(type, borrower)
    const existing = credentials.filter((credential) => credential.subjectId === borrower.id && credential.type === type).length
    return { id: borrower.id, subject: borrower.name, alias: displayAlias(borrower), location: borrower.city.split(',')[0], summary: `${borrower.kycStatus === 'verified' ? 'KYC verified' : 'KYC review'} · ${formatINR(borrower.monthlyIncome)} monthly`, eligibility: eligibility.text, eligible: eligibility.eligible, existing }
  })
  const columns = [
    { key: 'subject' as const, label: 'Subject', render: (row: (typeof rows)[number]) => <div><p className="font-medium">{row.subject}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{row.alias} · {row.location}</p></div> },
    { key: 'summary' as const, label: 'Verified data summary' },
    { key: 'eligibility' as const, label: 'Eligibility', render: (row: (typeof rows)[number]) => <StatusBadge status={row.eligible ? 'verified' : 'failed'} label={row.eligible ? 'Eligible' : 'Review needed'} /> },
    { key: 'existing' as const, label: 'Existing proofs', render: (row: (typeof rows)[number]) => <span>{row.existing}</span> },
    { key: 'id' as const, label: 'Action', render: () => <Button nativeButton={false} render={<Link href={`/issuer/${issuerId}/issue`} />} size="xs" variant="outline">Issue <ArrowRight data-icon="inline-end" /></Button> },
  ]
  return <Card><CardHeader><SectionHeading title="Borrower subjects" description="Search the synthetic subject registry, review verified summaries, and start an issuer-specific issuance flow." /></CardHeader><CardContent><DataTable rows={rows} columns={columns} pageSize={10} /></CardContent></Card>
}

function IssueWizard({ issuer, type, borrowers }: { issuer: Issuer; type: Credential['type']; borrowers: Borrower[] }) {
  const reducedMotion = useReducedMotion()
  const [step, setStep] = useState(0)
  const [subjectId, setSubjectId] = useState('')
  const [consent, setConsent] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [sending, setSending] = useState(false)
  const [issued, setIssued] = useState<Credential | null>(null)
  const subject = borrowers.find((borrower) => borrower.id === subjectId)
  const eligibility = subject ? eligibilityFor(type, subject) : null
  const claims = subject ? claimsFor(type, subject) : []
  const steps = ['Choose subject', 'Review claims', 'Confirm consent', 'Sign and issue']
  const columns = [
    { key: 'label' as const, label: 'Claim' },
    { key: 'value' as const, label: 'Value', render: (row: Claim) => String(row.value) },
    { key: 'disclosable' as const, label: 'Disclosure', render: (row: Claim) => <StatusBadge status={row.disclosable ? 'verified' : 'expired'} label={row.disclosable ? 'Selectively disclosable' : 'Not disclosable'} /> },
    { key: 'sensitive' as const, label: 'Privacy', render: (row: Claim) => <span className="text-xs text-muted-foreground">{row.sensitive ? 'Sensitive' : 'Standard'}</span> },
  ]
  async function signCredential() {
    setSigning(true)
    await new Promise((resolve) => window.setTimeout(resolve, 850))
    setSigning(false)
    setSigned(true)
  }
  async function sendToWallet() {
    if (!subject) return
    setSending(true)
    try {
      const credential = await issueCredential(type, subject.id, issuer.id)
      setIssued(credential)
      toast.success('Credential sent to borrower wallet')
      setStep(3)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to issue this credential')
    } finally {
      setSending(false)
    }
  }
  return <div className="grid gap-5">
    <Card><CardContent className="pt-5"><ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">{steps.map((label, index) => <li key={label} className="flex items-center gap-2"><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs ${step > index ? 'bg-primary text-primary-foreground' : step === index ? 'border border-primary text-primary' : 'border border-border text-muted-foreground'}`}>{step > index ? <Check className="size-3.5" /> : index + 1}</span><span className={`text-[11px] ${step === index ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span></li>)}</ol></CardContent></Card>
    {step === 0 && <Card><CardHeader><CardTitle className="text-sm">Step 1 · Choose a subject</CardTitle><CardDescription>Only verified synthetic profiles are available in this prototype.</CardDescription></CardHeader><CardContent><DataTable rows={borrowers.map((borrower) => ({ id: borrower.id, name: borrower.name, alias: displayAlias(borrower), verifiedData: `${formatINR(borrower.monthlyIncome)} monthly · ${borrower.kycStatus}`, eligible: eligibilityFor(type, borrower).eligible }))} columns={[{ key: 'name', label: 'Subject', render: (row) => <div><p className="font-medium">{row.name}</p><p className="text-[10px] text-muted-foreground">{row.alias}</p></div> }, { key: 'verifiedData', label: 'Verified data' }, { key: 'eligible', label: 'Eligibility', render: (row) => <StatusBadge status={row.eligible ? 'verified' : 'failed'} label={row.eligible ? 'Eligible' : 'Not eligible'} /> }, { key: 'id', label: 'Choose', render: (row) => <Button size="xs" variant={subjectId === row.id ? 'default' : 'outline'} onClick={() => setSubjectId(row.id)}>{subjectId === row.id ? 'Selected' : 'Choose subject'}</Button> }]} pageSize={10} /></CardContent></Card>}
    {step === 1 && <Card><CardHeader><CardTitle className="text-sm">Step 2 · Review claims</CardTitle><CardDescription>{subject ? `${subject.name} · ${credentialNames[type]}` : 'Select a subject before reviewing claims.'}</CardDescription></CardHeader><CardContent className="grid gap-4">{eligibility && <div className={`rounded-xl border px-4 py-3 text-sm ${eligibility.eligible ? 'border-success/25 bg-success/[0.06] text-success' : 'border-danger/30 bg-danger/[0.07] text-danger'}`}>{eligibility.text}</div>}{subject ? <DataTable rows={claims} columns={columns} pageSize={10} /> : <EmptyState title="Choose a subject first" description="Return to step one and select a borrower profile." />}</CardContent></Card>}
    {step === 2 && <Card><CardHeader><CardTitle className="text-sm">Step 3 · Confirm consent</CardTitle><CardDescription>Consent is recorded before signing. Only the approved proof is delivered to the borrower wallet.</CardDescription></CardHeader><CardContent className="grid gap-4"><div className="rounded-xl border border-chain/20 bg-chain/[0.05] p-4"><p className="text-xs font-medium">Borrower consent captured</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Captured in the Borrower Passport for {subject ? displayAlias(subject) : 'the selected subject'} · issuer request {issuer.id} · no raw statements or employer details are shared.</p></div><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4"><Checkbox checked={consent} onCheckedChange={(value) => setConsent(value === true)} aria-label="Confirm borrower consent" /><span><span className="text-xs font-medium">I confirm consent is on record</span><span className="mt-1 block text-[11px] text-muted-foreground">This confirms the issuer has a valid basis to issue the selected credential.</span></span></label></CardContent></Card>}
    {step === 3 && <Card><CardHeader><CardTitle className="text-sm">Step 4 · Sign and issue</CardTitle><CardDescription>Sign the credential, review its preview, then send it to the subject’s wallet.</CardDescription></CardHeader><CardContent className="grid gap-4">{!signed && !issued && <Button onClick={() => void signCredential()} disabled={signing || !eligibility?.eligible}>{signing ? <><LoaderCircle className="animate-spin" data-icon="inline-start" />Signing credential…</> : <><FileKey2 data-icon="inline-start" />Sign and prepare credential</>}</Button>}<AnimatePresence mode="wait">{signing && <motion.div key="signing" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] p-4"><motion.span animate={reducedMotion ? undefined : { rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}><KeyRound className="size-5 text-primary" /></motion.span><span className="text-xs">Validating claims and signing with the issuer key…</span></motion.div>}</AnimatePresence>{(signed || issued) && subject && <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.08] to-card"><CardHeader className="flex-row items-start justify-between"><div><CardTitle className="text-sm">{credentialNames[type]}</CardTitle><CardDescription>{displayAlias(subject)} · {issuer.name}</CardDescription></div><StatusBadge status={issued ? 'active' : 'pending'} label={issued ? 'In borrower wallet' : 'Signed preview'} /></CardHeader><CardContent className="grid gap-3"><p className="text-xs text-muted-foreground">Selective disclosure enabled · valid for 90 days</p>{claims.filter((claim) => claim.disclosable).map((claim) => <div key={claim.key} className="flex items-center justify-between gap-3 border-t border-border/70 pt-2 text-xs"><span>{claim.label}</span><span className="text-foreground">{String(claim.value)}</span></div>)}{issued ? <div className="rounded-lg bg-success/[0.07] px-3 py-2 text-xs text-success">Credential delivered. It is now visible in the borrower passport.</div> : <Button onClick={() => void sendToWallet()} disabled={sending}>{sending ? <><LoaderCircle className="animate-spin" data-icon="inline-start" />Sending…</> : <><ShieldCheck data-icon="inline-start" />Send to borrower wallet</>}</Button>}</CardContent></Card>}</CardContent></Card>}
    <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || signing || sending}>Back</Button><div className="flex gap-2">{step < 3 && <Button onClick={() => setStep((current) => Math.min(3, current + 1))} disabled={(step === 0 && !subject) || (step === 1 && !eligibility?.eligible) || (step === 2 && !consent)}>{step === 2 ? 'Continue to signing' : 'Continue'} <ArrowRight data-icon="inline-end" /></Button>}{issued && <Button variant="outline" nativeButton={false} render={<Link href={`/issuer/${issuer.id}/credentials`} />}>View credentials</Button>}</div></div>
  </div>
}

function CredentialsPage({ credentials }: { credentials: Credential[] }) {
  const columns = [
    { key: 'status' as const, label: 'Status', render: (row: (typeof rows)[number]) => <StatusBadge status={row.status} /> },
    { key: 'type' as const, label: 'Credential type' },
    { key: 'subject' as const, label: 'Subject alias' },
    { key: 'issued' as const, label: 'Issued' },
    { key: 'validUntil' as const, label: 'Valid until' },
    { key: 'index' as const, label: 'Status index', render: (row: (typeof rows)[number]) => <span className="font-mono">{row.index}</span> },
    { key: 'id' as const, label: 'Action', render: (row: (typeof rows)[number]) => row.status === 'active' ? <ConfirmDialog title="Revoke this credential?" description="Any lender checking this proof will reject it. The credential remains in the borrower wallet but its status index will be marked revoked and a new status root will be published on-chain." confirmLabel="Revoke credential" trigger={<Button size="xs" variant="destructive">Revoke</Button>} onConfirm={() => { void revokeCredential(row.id).then(() => toast.success('Credential revoked and status root updated')) }} /> : <span className="text-xs text-muted-foreground">No action</span> },
  ]
  const rows = credentials.map((credential) => ({ id: credential.id, status: credential.status, type: credentialNames[credential.type], subject: displayAliasFromId(credential.subjectId), issued: formatDate(credential.issuedAt), validUntil: formatDate(credential.validUntil), index: credential.statusListIndex }))
  return <Card><CardHeader><SectionHeading title="Credential registry" description="Revoke actions immediately update the borrower wallet, issuer status bitmap, and Explorer event feed." /></CardHeader><CardContent><DataTable rows={rows} columns={columns} pageSize={10} /></CardContent></Card>
}

function StatusListPage({ issuer, credentials, list }: { issuer: Issuer; credentials: Credential[]; list?: ReturnType<typeof useDemoStore.getState>['statusLists'][number] }) {
  const bits = list?.bits ?? Array.from({ length: 256 }, () => 0)
  const revokedIndices = list?.revokedIndices ?? []
  const revoked = credentials.filter((credential) => credential.status === 'revoked')
  return <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]"><Card><CardHeader><CardTitle className="text-sm">256-bit credential status list</CardTitle><CardDescription>Hover any cell to inspect its status-list index. Red cells are revoked proofs.</CardDescription></CardHeader><CardContent className="grid gap-5"><BitmapGrid bits={bits} label={`${issuer.name} status list`} /><div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground"><span className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-success/60" />Active</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-danger" />Revoked</span><span>{revokedIndices.length} revoked indices</span></div><HashChip value={list?.listHash ?? '0x000000000000…0000'} label="List hash" /></CardContent></Card><div className="grid content-start gap-4"><Card><CardHeader><CardTitle className="text-sm">Latest on-chain root</CardTitle><CardDescription>Status roots are mock receipts on Base Sepolia.</CardDescription></CardHeader><CardContent className="grid gap-4"><TxChip value={list?.lastOnChainRootTx ?? 'No root published'} /><div className="rounded-lg border border-chain/20 bg-chain/[0.05] p-3 text-xs text-chain">{revoked.length ? 'Status root published on-chain' : 'The next revocation will publish a new status root on-chain.'}</div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Revoked credentials</CardTitle></CardHeader><CardContent className="grid gap-2">{revoked.length ? revoked.map((credential) => <div key={credential.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-xs"><span>{displayAliasFromId(credential.subjectId)} · index {credential.statusListIndex}</span><StatusBadge status="revoked" /></div>) : <EmptyState title="No revoked credentials" description="Revoking a proof updates the red index cells and publishes a new list root." />}</CardContent></Card></div></div>
}

function KeysPage({ issuer }: { issuer: Issuer }) {
  const rotateIssuerKey = useDemoStore((state) => state.rotateIssuerKey)
  const didDocument = { '@context': ['https://www.w3.org/ns/did/v1'], id: issuer.did, verificationMethod: [{ id: `${issuer.did}#signing-key-1`, type: 'Ed25519VerificationKey2020', controller: issuer.did, publicKeyMultibase: issuer.keyHash }], authentication: [`${issuer.did}#signing-key-1`], assertionMethod: [`${issuer.did}#signing-key-1`], service: [{ id: `${issuer.did}#registry`, type: 'SanadTrustRegistry', serviceEndpoint: 'https://registry.sanad.demo/issuers' }] }
  return <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><Card><CardHeader><CardTitle className="text-sm">Issuer DID document</CardTitle><CardDescription>Public verification metadata only; no private signing key is shown.</CardDescription></CardHeader><CardContent><JsonViewer value={didDocument} /></CardContent></Card><div className="grid content-start gap-4"><Card><CardHeader><CardTitle className="text-sm">Signing key</CardTitle></CardHeader><CardContent className="grid gap-3"><HashChip value={issuer.keyHash} label="Key hash" /><div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Registry status</span><StatusBadge status={issuer.registryStatus} /></div><ConfirmDialog title="Rotate this issuer key?" description="The mock key hash will change and a registry event will be published. Existing credentials will still be represented as issued with the previous key in this demo." confirmLabel="Rotate mock key" trigger={<Button variant="outline"><LockKeyhole data-icon="inline-start" />Rotate key</Button>} onConfirm={() => { rotateIssuerKey(issuer.id); toast.success('Issuer key hash rotated and registry event recorded.') }} /><p className="text-[11px] text-muted-foreground">This demo rotates only the public key hash; no private signing key is stored or exported.</p></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Credential schemas</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{issuer.schemas.map((schema) => <Badge key={schema} variant="secondary" className="font-mono text-[10px]">{schema}</Badge>)}</CardContent></Card></div></div>
}

function ActivityPage({ issuer, credentials, activity, chainEvents }: { issuer: Issuer; credentials: Credential[]; activity: ReturnType<typeof useDemoStore.getState>['activity']; chainEvents: ReturnType<typeof useDemoStore.getState>['chainEvents'] }) {
  const issuerIds = new Set(credentials.map((credential) => credential.id))
  const eventRows = credentials.map((credential) => ({ id: `credential-${credential.id}`, timestamp: credential.status === 'revoked' ? activity.find((item) => item.credentialId === credential.id && item.type === 'credential_revoked')?.timestamp ?? credential.issuedAt : credential.issuedAt, event: credential.status === 'revoked' ? 'Credential revoked' : 'Credential issued', subject: displayAliasFromId(credential.subjectId), detail: `${credentialNames[credential.type]} · status index ${credential.statusListIndex}`, status: credential.status }))
  const activityRows = activity.filter((item) => item.credentialId && issuerIds.has(item.credentialId)).map((item) => ({ id: item.id, timestamp: item.timestamp, event: item.type?.replaceAll('_', ' ') ?? 'Credential activity', subject: displayAliasFromId(credentials.find((credential) => credential.id === item.credentialId)?.subjectId ?? 'unknown'), detail: item.description ?? 'Issuer credential event', status: item.type === 'credential_revoked' ? 'revoked' : 'active' }))
  const unique = new Map([...eventRows, ...activityRows].map((row) => [row.id, row]))
  const rows = Array.from(unique.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  const columns = [{ key: 'event' as const, label: 'Event' }, { key: 'subject' as const, label: 'Subject' }, { key: 'detail' as const, label: 'Details' }, { key: 'timestamp' as const, label: 'Timestamp', render: (row: (typeof rows)[number]) => formatDate(row.timestamp, 'd MMM yyyy, HH:mm') }, { key: 'status' as const, label: 'Status', render: (row: (typeof rows)[number]) => <StatusBadge status={row.status} /> }]
  const rootEvents = chainEvents.filter((event) => event.decoded.issuerId === issuer.id)
  return <Card><CardHeader><SectionHeading title="Issuer audit events" description="Credential lifecycle events are joined to status-root updates." action={<Button size="sm" variant="outline" disabled={!rows.length} onClick={() => downloadCsvFile('sanad-issuer-activity.csv', rows.map((row) => ({ event: row.event, subject: row.subject, detail: row.detail, timestamp: row.timestamp, status: row.status })))}><Download data-icon="inline-start" />Export CSV</Button>} /></CardHeader><CardContent className="grid gap-4"><DataTable rows={rows} columns={columns} pageSize={10} />{rootEvents.length > 0 && <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4"><span className="text-xs text-muted-foreground">Recent registry receipts</span>{rootEvents.slice(0, 3).map((event) => <TxChip key={event.id} value={event.txHash} block={event.block} />)}</div>}</CardContent></Card>
}
