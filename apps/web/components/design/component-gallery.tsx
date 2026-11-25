'use client'

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, ShieldCheck, Sparkles } from 'lucide-react'
import { getBorrowers, getCredentials, getIssuers, getOffers, getLenderRequests, getActivity, getStatusList } from '@/lib/api'
import { formatINR } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleSwitcher, LanguageToggle } from '@/components/layout/topbar-controls'
import { CredentialCard, ConsentReceiptRow, OfferCard, OfferCompare, PermissionSlip, Stepper, Timeline, VerificationChecklist } from '@/components/shared/credit-components'
import { BitmapGrid, CopyButton, EmptyState, Gauge, HashChip, JsonViewer, PipelineViz, Skeletons, StatCard, StatusBadge, TxChip } from '@/components/shared/primitives'
import { BottomSheet, ConfirmDialog, DataTable } from '@/components/shared/overlays'
import { RiskBreakdownChart } from './risk-breakdown-chart'
import type { ConsentReceipt, RunStep } from '@/types'

const sampleSteps: RunStep[] = [
  { offsetSeconds: 0, type: 'intent', title: 'Request understood', detail: '₹50,000 for a vehicle repair · EMI under ₹3,000' },
  { offsetSeconds: 2, type: 'permission', title: 'Mandate checked', detail: 'Two trusted lenders are allowed', pepRule: 'lender_in_mandate', decision: 'allow' },
  { offsetSeconds: 4, type: 'proof', title: 'Minimum proof shared', detail: 'Income threshold only · employer details withheld', pepRule: 'disclosure_subset_of_mandate', decision: 'allow' },
]

export function ComponentGallery() {
  const samples = useQuery({ queryKey: ['design-gallery'], queryFn: async () => {
    const [borrowers, issuers, credentials, offers, requests, activity, statusList] = await Promise.all([getBorrowers(), getIssuers(), getCredentials('robin-das'), getOffers('run-robin'), getLenderRequests('lender-a'), getActivity('robin-das'), getStatusList('issuer-gig')])
    return { borrowers, issuers, credentials, offers, requests, activity, statusList }
  } })
  if (samples.isLoading || !samples.data) return <div className="mx-auto max-w-6xl"><GalleryHeading /><Skeletons rows={5} /></div>
  const { borrowers, issuers, credentials, offers, requests, activity, statusList } = samples.data
  const borrower = borrowers.find((item) => item.id === 'robin-das')!
  const issuersById = Object.fromEntries(issuers.map((issuer) => [issuer.id, issuer.name]))
  const lenders = { 'lender-a': 'QuickRepair Micro Finance', 'lender-b': 'Gramin Working Capital NBFC' }
  const receipt = activity.find((item) => item.id === 'receipt-01') as unknown as ConsentReceipt
  const rows = requests.slice(0, 10).map((request) => ({ id: request.id, borrower: request.borrowerAlias, received: request.receivedAt.slice(0, 10), status: request.status }))
  const columns = [
    { key: 'id' as const, label: 'Request ID' }, { key: 'borrower' as const, label: 'Borrower' }, { key: 'received' as const, label: 'Received' },
    { key: 'status' as const, label: 'Status', render: (row: (typeof rows)[number]) => <StatusBadge status={row.status} /> },
  ]
  const statusBits = statusList?.bits ?? Array.from({ length: 256 }, (_, index) => index === 11 || index === 37 ? 1 : 0)
  const offersWithNames = offers.map((offer) => ({ offer, lenderName: lenders[offer.lenderId as keyof typeof lenders] }))

  return <div className="mx-auto max-w-6xl pb-12"><GalleryHeading /><section className="mb-9 grid gap-3 sm:grid-cols-3"><StatCard label="Borrower passport" value="Active" change={`${credentials.length} verified proof credentials`} icon={<ShieldCheck className="size-4" />} /><StatCard label="Monthly income proof" value={formatINR(borrower.monthlyIncome)} change="Shared as an eligibility threshold" accent="amber" icon={<Sparkles className="size-4" />} /><StatCard label="Public receipts" value={activity.filter((item) => item.id.startsWith('receipt')).length} change="Commitments only · no personal data" accent="violet" icon={<Check className="size-4" />} /></section>

    <Section title="Borrower proof components" description="Verifiable credentials, selective disclosure and eligibility checks."><div className="grid gap-3 lg:grid-cols-2"><CredentialCard credential={credentials[1] ?? credentials[0]} issuerName={issuersById[credentials[1]?.issuerId ?? credentials[0].issuerId]} /><PermissionSlip permissions={[{ label: 'KYC status', allowed: true }, { label: 'Income at least ₹25,000', allowed: true }, { label: 'Employer name', allowed: false }, { label: 'Raw bank statements', allowed: false }]} /></div><div className="mt-3"><VerificationChecklist items={[{ label: 'Credential signature valid', detail: 'Signed by a registry-approved issuer', passed: true }, { label: 'Status list entry active', detail: 'Checked against the latest issuer root', passed: true }, { label: 'Employer name requested', detail: 'Blocked by the disclosure policy', passed: false }]} /></div></Section>

    <Section title="Agent journey components" description="Timeline, progress and trust policy visuals used across the portals."><div className="grid gap-3 lg:grid-cols-2"><Card><CardHeader><CardTitle className="text-sm">Run timeline</CardTitle></CardHeader><CardContent><Timeline steps={sampleSteps} /></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Agent run progress</CardTitle></CardHeader><CardContent className="grid gap-6"><Stepper steps={['Request', 'Permission', 'Proof', 'Offers']} current={2} /><PipelineViz stages={['Borrower wallet', 'Policy engine', 'Lender', 'Receipt']} /><Gauge value={31} label="FOIR · within policy" max={50} /></CardContent></Card></div></Section>

    <Section title="Risk breakdown chart" description="A synthetic lender risk score is explainable and componentized with Recharts."><Card><CardHeader><CardTitle className="text-sm">Illustrative risk factors · {requests[0]?.borrowerAlias}</CardTitle></CardHeader><CardContent><RiskBreakdownChart rows={requests[0]?.underwriting.riskBreakdown ?? []} /></CardContent></Card></Section>

    <Section title="Offer and receipt components" description="The borrower sees transparent repayment figures and a clear audit trail."><div className="grid gap-3 lg:grid-cols-2"><div className="grid gap-3">{offersWithNames.slice(0, 2).map(({ offer, lenderName }, index) => <OfferCard key={offer.id} offer={offer} lenderName={lenderName} recommended={index === 0} />)}</div><div className="grid content-start gap-3"><Card><CardHeader><CardTitle className="text-sm">Ranked offer comparison</CardTitle></CardHeader><CardContent><OfferCompare offers={offers} lenderNames={lenders} /></CardContent></Card><ConsentReceiptRow receipt={receipt} lenderName={lenders[receipt.lenderId as keyof typeof lenders]} /></div></div></Section>

    <Section title="Status, hashes and chain events" description="Technical values remain inspectable without placing borrower data on-chain."><Card><CardContent className="grid gap-5 pt-4"><div className="flex flex-wrap items-center gap-2"><StatusBadge status="verified" label="Verified" /><StatusBadge status="pending" /><StatusBadge status="revoked" /><StatusBadge status="expired" /><StatusBadge status="onchain" label="On-chain" /></div><div className="flex flex-wrap items-center gap-2"><HashChip value="0x7e2b9ac04d1a6f2e…812f" label="Commitment" /><CopyButton value="0x7e2b9ac04d1a6f2e812f" label="Copy receipt hash" /><TxChip value="0x91ce45bf28a1…aa18" block={19845021} /></div><div><p className="mb-3 text-xs font-medium">Issuer status bitmap · 256 slots</p><BitmapGrid bits={statusBits} /></div></CardContent></Card></Section>

    <Section title="Interaction and data components" description="Sortable tables, JSON inspection, overlays and feedback patterns."><div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]"><Card><CardHeader><CardTitle className="text-sm">Filterable request table</CardTitle></CardHeader><CardContent><DataTable rows={rows} columns={columns} pageSize={4} /></CardContent></Card><div className="grid content-start gap-3"><Card><CardHeader><CardTitle className="text-sm">Typed proof preview</CardTitle></CardHeader><CardContent><JsonViewer value={{ type: credentials[1]?.type, issuer: issuersById[credentials[1]?.issuerId ?? ''], claims: ['incomeThreshold', 'consecutiveMonths'], disclosure: 'minimum necessary' }} /></CardContent></Card><EmptyState title="No blocked actions" description="When a proof is out of scope, it stays in the borrower wallet." /></div></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Card><CardHeader><CardTitle className="text-sm">Loading skeletons</CardTitle></CardHeader><CardContent><Skeletons rows={2} /></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Actions and overlays</CardTitle></CardHeader><CardContent className="flex flex-wrap items-center gap-2"><BottomSheet title="Repayment schedule" description="An amortization view for a sample offer." trigger={<Button variant="outline" size="sm">Open bottom sheet</Button>}><div className="rounded-xl border border-border bg-background p-4 text-xs text-muted-foreground">18 monthly payments · sample only</div></BottomSheet><ConfirmDialog title="Revoke agent permission?" description="The agent will stop before sharing another proof." confirmLabel="Revoke mandate" trigger={<Button variant="outline" size="sm">Open confirmation</Button>} onConfirm={() => toast.success('Confirmation action completed')} /><Button size="sm" onClick={() => toast.success('Receipt saved to your activity feed')}>Show toast</Button><RoleSwitcher /><LanguageToggle /></CardContent></Card></div><div className="mt-3 rounded-2xl border border-border bg-card/60 p-4"><p className="text-xs font-medium">Floating demo panel</p><p className="mt-1 text-[11px] text-muted-foreground">The live persona, simulation speed, technical-details and reset controls are available at the bottom-left of this page.</p></div></Section>

  </div>
}

function GalleryHeading() {
  return <header className="mb-8"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-primary"><Sparkles className="size-3" />Design system</div><h1 className="text-3xl font-semibold tracking-tight">Shared component gallery</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A working catalog of the SANAD foundation components, using synthetic borrower and lender data.</p></header>
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="mb-9"><div className="mb-4"><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>{children}</section>
}
