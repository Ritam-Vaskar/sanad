'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { BadgeCheck, CalendarDays, Check, CircleCheck, LockKeyhole, Shield, UserRoundCheck } from 'lucide-react'
import type { Credential, Offer, RunStep } from '@/types'
import { formatDate, formatINR } from '@/lib/format'
import { useMessages } from '@/lib/i18n/use-messages'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HashChip, StatusBadge, TxChip } from './primitives'

const typeNames: Record<string, string> = { KycCredential: 'Identity verified', GigIncomeCredential: 'Gig income proof', CashFlowCredential: 'Cashflow stability' }

export function CredentialCard({ credential, issuerName }: { credential: Credential; issuerName?: string }) {
  const displayedIssuer = issuerName ?? credential.issuerId
  const claims = credential.claims.filter((claim) => claim.sharedByDefault).slice(0, 3)
  return <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.06]"><div className="absolute right-0 top-0 h-32 w-32 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/10 blur-2xl" /><CardHeader className="relative flex-row items-start justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Shield className="size-5" /></span><div><CardTitle>{typeNames[credential.type] ?? credential.type}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{displayedIssuer}</p></div></div><StatusBadge status={credential.status} /></CardHeader><CardContent className="relative grid gap-4"><div className="grid gap-2">{claims.map((claim) => <div key={claim.key} className="flex items-center gap-2 text-xs text-foreground/90"><CircleCheck className="size-3.5 text-success" />{claim.label}</div>)}</div><div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />Valid until {formatDate(credential.validUntil)}</span><BadgeCheck className="size-4 text-primary" /></div><HashChip value={`status #${credential.statusListIndex}`} label="Index" /></CardContent></Card>
}

export function PermissionSlip({ permissions }: { permissions: { label: string; allowed: boolean }[] }) {
  const copy = useMessages()
  return <Card className="border-primary/20 bg-primary/[0.035]"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Shield className="size-4 text-primary" />Permission slip</CardTitle></CardHeader><CardContent className="grid gap-3"><div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">{copy.permission.humanOnly}</div>{permissions.map((item) => <div key={item.label} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-xs ${item.allowed ? 'border-success/20 bg-success/[0.06]' : 'border-danger/20 bg-danger/[0.05]'}`}><span className="flex items-center gap-2">{item.allowed ? <Check className="size-3.5 text-success" /> : <LockKeyhole className="size-3.5 text-danger" />}{item.label}</span><span className={item.allowed ? 'text-success' : 'text-danger'}>{item.allowed ? copy.permission.allowed : copy.permission.locked}</span></div>)}</CardContent></Card>
}

export function VerificationChecklist({ items }: { items: { label: string; detail?: string; passed: boolean }[] }) {
  return <Card><CardHeader><CardTitle className="text-sm">Verification checks</CardTitle></CardHeader><CardContent className="grid gap-3">{items.map((item) => <div key={item.label} className="flex items-start gap-3"><span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${item.passed ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{item.passed ? <Check className="size-3" /> : <span className="text-xs">!</span>}</span><div><p className="text-xs font-medium">{item.label}</p>{item.detail && <p className="mt-0.5 text-[11px] text-muted-foreground">{item.detail}</p>}</div></div>)}</CardContent></Card>
}

export function Timeline({ steps }: { steps: RunStep[] }) {
  const reduced = useReducedMotion()
  return <ol className="grid gap-0">{steps.map((step, index) => <motion.li key={`${step.title}-${index}`} initial={reduced ? false : { opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduced ? 0 : Math.min(index * 0.04, 0.35) }} className="relative flex gap-3 pb-5 last:pb-0"><span className="relative z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-primary/25 bg-surface text-primary"><CircleCheck className="size-3.5" /></span>{index < steps.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-8 w-px bg-border" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><p className="text-sm font-medium">{step.title}</p>{step.decision && <StatusBadge status={step.decision === 'allow' ? 'verified' : 'failed'} label={step.decision} />}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>{step.pepRule && <code className="mt-1 inline-block font-mono text-[10px] text-primary">{step.pepRule}</code>}</div></motion.li>)}</ol>
}

export function OfferCard({ offer, recommended = false, lenderName }: { offer: Offer; recommended?: boolean; lenderName?: string }) {
  const copy = useMessages()
  const displayedLender = lenderName ?? offer.lenderId
  return <Card className={recommended ? 'border-primary/40 bg-gradient-to-br from-primary/[0.08] to-card' : ''}><CardHeader className="flex-row items-start justify-between"><div><CardTitle className="text-sm">{displayedLender}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{offer.rate}% APR · {offer.tenure} months</p></div>{recommended && <Badge className="rounded-full bg-primary/15 text-primary">{copy.offers.lowestCost}</Badge>}</CardHeader><CardContent className="grid grid-cols-2 gap-3"><div><p className="text-[11px] text-muted-foreground">Principal</p><p className="mt-1 font-semibold">{formatINR(offer.principal)}</p></div><div><p className="text-[11px] text-muted-foreground">{copy.offers.emi}</p><p className="mt-1 font-semibold">{formatINR(offer.emi, { decimals: 2 })}</p></div><div><p className="text-[11px] text-muted-foreground">Total repayment</p><p className="mt-1 text-sm">{formatINR(offer.totalRepayment, { decimals: 2 })}</p></div><div><p className="text-[11px] text-muted-foreground">{copy.offers.totalCost}</p><p className="mt-1 text-sm">{formatINR(offer.totalCost, { decimals: 2 })}</p></div><div className="col-span-2 border-t border-border pt-3"><HashChip value={offer.offerHash} label="Offer" /></div></CardContent></Card>
}

export function OfferCompare({ offers, lenderNames = {} }: { offers: Offer[]; lenderNames?: Record<string, string> }) {
  const sorted = [...offers].sort((a, b) => a.totalCost - b.totalCost)
  return <div className="grid gap-3 md:grid-cols-2">{sorted.map((offer, index) => <OfferCard key={offer.id} offer={offer} lenderName={lenderNames[offer.lenderId]} recommended={index === 0} />)}</div>
}

export function ConsentReceiptRow({ receipt, lenderName }: { receipt: { id: string; lenderId: string; categories: string[]; timestamp: string; txHash: string; block: number }; lenderName?: string }) {
  const copy = useMessages()
  const displayedLender = lenderName ?? receipt.lenderId
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-chain/10 text-chain"><UserRoundCheck className="size-3.5" /></span><span className="text-xs font-medium">{displayedLender}</span><StatusBadge status="onchain" label={copy.activity.receipt} /></div><p className="mt-2 truncate text-[11px] text-muted-foreground">{receipt.categories.join(' · ')}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatDate(receipt.timestamp, 'd MMM, HH:mm')}</p></div><TxChip value={receipt.txHash} block={receipt.block} /></div>
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return <ol className="flex items-center gap-2">{steps.map((step, index) => <li key={step} className="flex min-w-0 flex-1 items-center gap-2"><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs ${index < current ? 'bg-primary text-primary-foreground' : index === current ? 'border border-primary text-primary' : 'border border-border text-muted-foreground'}`}>{index < current ? <Check className="size-3.5" /> : index + 1}</span><span className={`hidden truncate text-[11px] sm:block ${index === current ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>{index < steps.length - 1 && <span aria-hidden="true" className="h-px flex-1 bg-border" />}</li>)}</ol>
}
