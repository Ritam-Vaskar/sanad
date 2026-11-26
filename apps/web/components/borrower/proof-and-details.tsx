'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, Banknote, Check, CircleCheck, Fingerprint, Landmark, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { Borrower, Credential, Issuer } from '@/types'
import { issueCredential } from '@/lib/api'
import { useDemoStore } from '@/lib/store/demo-store'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/shared/primitives'
import { BorrowerEmpty, DetailsSheet, ProofCard, SectionHeading, TechnicalKeyValue, ValueChip } from './borrower-ui'
import { t, type BorrowerLanguage } from './copy'

const issuerForType: Record<Credential['type'], string> = { KycCredential: 'issuer-kyc', GigIncomeCredential: 'issuer-gig', CashFlowCredential: 'issuer-aa' }
const proofInfo: Record<Credential['type'], { title: string; subtitle: string; purpose: string; icon: typeof BadgeCheck; reads: string[] }> = {
  KycCredential: { title: 'Identity proof', subtitle: 'A trusted check of your identity and age.', purpose: 'to confirm the applicant is verified and over 21', icon: Fingerprint, reads: ['Identity document match', 'Age threshold (21+)', 'Selfie match result'] },
  GigIncomeCredential: { title: 'Verified income proof', subtitle: 'A threshold claim from your earning platform.', purpose: 'to confirm stable income for a small loan', icon: Banknote, reads: ['Monthly income threshold', 'Number of earning months', 'Platform activity check'] },
  CashFlowCredential: { title: 'Income stability proof', subtitle: 'A summary of regular income activity.', purpose: 'to check income consistency without sharing statements', icon: Landmark, reads: ['Income stability band', 'Active earning months', 'Existing monthly obligations'] },
}
const visibilityLabel = (claim: Credential['claims'][number]) => !claim.disclosable ? 'Never shared' : claim.sharedByDefault ? 'Shareable' : 'Hidden by default'

export function CredentialDetails({ credentialId, borrower, credentials, issuers, language, showTechnical }: { credentialId: string; borrower: Borrower; credentials: Credential[]; issuers: Issuer[]; language: BorrowerLanguage; showTechnical: boolean }) {
  const credential = credentials.find((item) => item.id === credentialId)
  const activity = useDemoStore((state) => state.activity)
  const lenders = useDemoStore((state) => state.lenders)
  if (!credential) return <BorrowerEmpty title="Verified proof not found" description="This proof may have been removed or does not belong to this Sanad ID." action={<Button nativeButton={false} role="link" render={<Link href="/borrower" />} size="sm" variant="outline">Back to passport</Button>} />
  const issuer = issuers.find((item) => item.id === credential.issuerId)
  const relatedActivity = activity.filter((item) => item.credentialId === credential.id || (item.mandateId && item.lenderId && item.categories?.some((category) => credential.claims.some((claim) => claim.key === category))))
  const seenBy = relatedActivity.filter((item) => item.lenderId)
  return <div className="grid gap-4"><SectionHeading eyebrow="Your passport" title={proofInfo[credential.type].title} description="Review each claim and choose what may be shared." action={<Button nativeButton={false} role="link" render={<Link href="/borrower" aria-label="Back to passport" />} size="icon-sm" variant="ghost"><ArrowLeft /></Button>} /><Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] to-card"><CardHeader className="flex-row items-start justify-between"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><ShieldCheck /></span><div><CardTitle className="text-sm">{proofInfo[credential.type].title}</CardTitle><p className="mt-1 text-[11px] text-muted-foreground">Issued to {borrower.name}</p></div></div><StatusBadge status={credential.status} label={credential.status === 'active' ? 'Verified' : credential.status} /></CardHeader><CardContent className="grid gap-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">All claims</p>{credential.claims.map((claim) => <div key={claim.key} className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-background/50 p-3"><div className="min-w-0"><p className="text-xs font-medium">{claim.label}</p><p className="mt-1 break-words text-[11px] text-muted-foreground">{typeof claim.value === 'boolean' ? claim.value ? 'Yes' : 'No' : claim.value}</p></div><ValueChip tone={!claim.disclosable ? 'danger' : claim.sharedByDefault ? 'success' : 'neutral'}>{visibilityLabel(claim)}</ValueChip></div>)}</CardContent></Card><Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-sm">Issued by</CardTitle><p className="mt-1 text-xs text-muted-foreground">{issuer?.name ?? 'Trusted issuer'}</p></div><ValueChip tone="success"><BadgeCheck />Trusted issuer in registry</ValueChip></CardHeader><CardContent className="grid gap-3"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Issued</span><span>{formatDate(credential.issuedAt)}</span></div><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Valid until</span><span>{formatDate(credential.validUntil)}</span></div><div className="rounded-xl border border-border bg-background/60 p-3"><div className="flex items-center gap-2 text-xs font-medium"><Check className="text-success" />Checked just now</div><div className="mt-3 flex items-center gap-2"><span className="size-2 rounded-full bg-success" /><span className="h-px flex-1 bg-success/40" /><span className={`size-2 rounded-full ${credential.status === 'active' ? 'bg-success' : 'bg-warning'}`} /><span className="h-px flex-1 bg-border" /><span className="size-2 rounded-full bg-muted-foreground/50" /></div><div className="mt-1 flex justify-between text-[9px] text-muted-foreground"><span>Issued</span><span>Checked</span><span>Valid to {formatDate(credential.validUntil, 'd MMM')}</span></div></div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Who has seen this</CardTitle><p className="text-xs text-muted-foreground">Only a verified claim was shared, never the source document.</p></CardHeader><CardContent className="grid gap-2">{seenBy.length === 0 ? <BorrowerEmpty title="Not shared yet" description="This proof has not been used in a lender request." /> : seenBy.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3"><div className="min-w-0"><p className="truncate text-xs font-medium">{lenders.find((lender) => lender.id === entry.lenderId)?.name ?? 'Verified lender'}</p><p className="mt-1 text-[10px] text-muted-foreground">{entry.categories?.map((key) => credential.claims.find((claim) => claim.key === key)?.label ?? key).join(' · ')}</p></div><span className="shrink-0 text-[9px] text-muted-foreground">{formatDate(entry.timestamp, 'd MMM')}</span></div>)}</CardContent></Card><DetailsSheet title="Technical details" description="These identifiers help trusted services check the proof. They are not shown on your main passport." triggerLabel={t(language, 'Details')}><TechnicalKeyValue label="Issuer DID" value={issuer?.did ?? credential.issuerId} /><TechnicalKeyValue label="Key hash" value={issuer?.keyHash ?? 'Not available'} /><TechnicalKeyValue label="Status index" value={credential.statusListIndex} /><TechnicalKeyValue label="Raw disclosure list" value={JSON.stringify(credential.claims.map((claim) => ({ key: claim.key, shareable: claim.disclosable, default: claim.sharedByDefault })))} /><p className="text-[10px] text-muted-foreground">{showTechnical ? 'Technical details are also enabled in your profile.' : 'Technical identifiers are kept inside this details view.'}</p></DetailsSheet></div>
}

export function AddProofScreen({ borrower, issuers, language }: { borrower: Borrower; issuers: Issuer[]; language: BorrowerLanguage }) {
  const allCredentials = useDemoStore((state) => state.credentials)
  const credentials = allCredentials.filter((item) => item.subjectId === borrower.id)
  const speed = useDemoStore((state) => state.speed)
  const [selected, setSelected] = useState<Credential['type'] | null>(null)
  const [consented, setConsented] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [issued, setIssued] = useState<Credential | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ineligibleIncome = selected === 'GigIncomeCredential' && borrower.monthlyIncome < 25000
  const types = Object.keys(proofInfo) as Credential['type'][]
  const goBack = () => { setSelected(null); setConsented(false); setError(''); setIssued(null); setCurrentStep(-1) }

  async function issue() {
    if (!selected || !consented || busy || ineligibleIncome) return
    setBusy(true)
    setError('')
    try {
      const steps = ['Connecting', 'Reading synthetic data', 'Issuer signing', 'Saved to your passport']
      for (let index = 0; index < steps.length; index += 1) {
        setCurrentStep(index)
        await new Promise((resolve) => window.setTimeout(resolve, 500 / speed))
      }
      setIssued(await issueCredential(selected, borrower.id))
      toast.success('Verified proof added to your passport.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The issuer could not complete this request.')
      setCurrentStep(-1)
    } finally {
      setBusy(false)
    }
  }

  if (issued) return <div className="grid gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-success/10 text-success"><CircleCheck /></div><SectionHeading eyebrow="Saved" title="Your new proof is ready" description="It has been added to this Sanad ID and will appear in the issuer portal." /><ProofCard credential={issued} issuerName={issuers.find((issuer) => issuer.id === issued.issuerId)?.name ?? 'Trusted issuer'} language={language} showTechnical={false} /><Button nativeButton={false} role="link" render={<Link href="/borrower" />}>Back to passport<ArrowRight data-icon="inline-end" /></Button></div>

  if (!selected) return <div className="grid gap-4"><SectionHeading eyebrow="Verified proof" title="Add a proof" description="Choose a trusted issuer. They will read only the synthetic data listed before you consent." /><div className="grid gap-3">{types.map((type) => { const info = proofInfo[type]; const Icon = info.icon; const issuer = issuers.find((item) => item.id === issuerForType[type]); const unavailable = type === 'GigIncomeCredential' && borrower.monthlyIncome < 25000; return <button key={type} type="button" onClick={() => { setSelected(type); setConsented(false); setError('') }} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-primary/30 hover:bg-surface-raised focus-visible:outline-primary"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Icon /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{info.title}</span><span className="mt-1 block text-[11px] leading-4 text-muted-foreground">{issuer?.name ?? 'Trusted issuer'} · {info.subtitle}</span>{unavailable && <span className="mt-1 block text-[10px] text-warning">Not available yet · below the ₹25,000 issuer threshold</span>}</span><ArrowRight className="shrink-0 text-muted-foreground" /></button> })}</div>{credentials.length === 0 && <BorrowerEmpty title="Your passport is ready for a first proof" description="Choose one of the trusted issuers above to begin." />}</div>

  const info = proofInfo[selected]
  const issuer = issuers.find((item) => item.id === issuerForType[selected])
  return <div className="grid gap-4"><SectionHeading eyebrow="Issuer consent" title={info.title} description="Review exactly what the issuer will read before you approve." action={<Button size="icon-sm" variant="ghost" aria-label="Back to issuers" onClick={goBack}><ArrowLeft /></Button>} /><Card><CardHeader className="flex-row items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><info.icon /></span><div><CardTitle className="text-sm">{issuer?.name ?? 'Trusted issuer'}</CardTitle><p className="mt-1 text-[10px] text-muted-foreground">Trusted issuer in registry</p></div></CardHeader><CardContent className="grid gap-3"><p className="text-xs leading-5 text-muted-foreground">The issuer will use these fields {info.purpose}.</p><div className="grid gap-2">{info.reads.map((item) => <div key={item} className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs"><Check className="text-success" />{item}</div>)}</div><div className="rounded-xl border border-danger/20 bg-danger/[0.04] p-3"><p className="text-[10px] font-semibold text-danger">Never requested</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Employer name, bank statements and exact account balance are not requested.</p></div>{ineligibleIncome && <div role="alert" className="rounded-xl border border-danger/25 bg-danger/[0.06] p-3 text-xs leading-5 text-danger">Verified income is below the 25,000 threshold. The issuer cannot sign this claim.</div>}{!ineligibleIncome && <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-xs leading-5"><Checkbox checked={consented} onCheckedChange={(value) => setConsented(value === true)} aria-label="I agree to this issuer reading the listed synthetic data" /><span>I agree to this issuer reading the listed synthetic data for this proof.</span></label>}{error && <div role="alert" className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-xs text-danger">{error}</div>}{busy && <div className="grid gap-2 rounded-xl border border-border bg-background/60 p-3">{['Connecting', 'Reading synthetic data', 'Issuer signing', 'Saved to your passport'].map((step, index) => <div key={step} className={`flex items-center gap-2 text-[11px] ${currentStep >= index ? 'text-primary' : 'text-muted-foreground'}`}><span className={`grid size-5 place-items-center rounded-full ${currentStep >= index ? 'bg-primary/15' : 'bg-muted'}`}>{currentStep > index ? <Check /> : index + 1}</span>{step}</div>)}</div>}</CardContent><CardFooter><Button disabled={!consented || busy || ineligibleIncome} className="w-full" onClick={issue}>{busy ? 'Issuing your proof…' : ineligibleIncome ? 'Not available yet' : 'Confirm and add proof'}</Button></CardFooter></Card><p className="text-center text-[10px] text-muted-foreground">You can review or revoke a proof from your passport at any time.</p></div>
}
