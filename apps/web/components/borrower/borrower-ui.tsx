'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { BadgeCheck, CalendarDays, Check, ChevronRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import type { Credential } from '@/types'
import { formatDate } from '@/lib/format'
import { t, type BorrowerLanguage } from './copy'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/overlays'
import { Skeleton } from '@/components/ui/skeleton'
import { openChainDetail } from '@/lib/chain-details'
import { useDemoStore } from '@/lib/store/demo-store'

const proofTitles: Record<Credential['type'], string> = {
  KycCredential: 'Identity proof',
  GigIncomeCredential: 'Verified income proof',
  CashFlowCredential: 'Income stability proof',
}

export function SectionHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-5 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p><h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}</div>{action}</div>
}

export function BorrowerError({ retry, message }: { retry: () => void; message?: string }) {
  return <Card className="border-danger/30 bg-danger/[0.04]"><CardHeader><CardTitle className="text-sm text-danger">{t('en', 'Something went wrong')}</CardTitle><p className="text-xs leading-5 text-muted-foreground">{message ?? 'We could not load your passport. Your saved information has not changed.'}</p></CardHeader><CardContent><Button variant="outline" size="sm" onClick={retry}>{t('en', 'Retry')}</Button></CardContent></Card>
}

export function BorrowerEmpty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface/60 p-5 text-center"><span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck /></span><h3 className="text-sm font-medium">{title}</h3><p className="max-w-[260px] text-xs leading-5 text-muted-foreground">{description}</p>{action}</div>
}

export function BorrowerSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="grid gap-3" aria-label="Loading your passport" aria-busy="true">{Array.from({ length: rows }, (_, index) => <div key={index} className="grid gap-3 rounded-2xl border border-border bg-surface p-4"><div className="flex items-center gap-3"><Skeleton className="size-10 rounded-xl" /><div className="grid flex-1 gap-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-2.5 w-2/3" /></div></div><Skeleton className="h-14 w-full" /></div>)}</div>
}

export function ProofCard({ credential, issuerName, language, showTechnical, onRenew, onRevoke }: { credential: Credential; issuerName: string; language: BorrowerLanguage; showTechnical: boolean; onRenew?: (credential: Credential) => void; onRevoke?: () => void }) {
  const sharedClaims = credential.claims.filter((claim) => claim.sharedByDefault)
  const title = t(language, proofTitles[credential.type])
  const statusLabel = t(language, credential.status === 'active' ? 'Verified' : credential.status === 'expired' ? 'Expired' : 'Revoked')
  const statusClass = credential.status === 'active' ? 'border-success/25 bg-success/10 text-success' : credential.status === 'expired' ? 'border-warning/25 bg-warning/10 text-warning' : 'border-danger/25 bg-danger/10 text-danger'
  return <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.055] shadow-sm"><div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-primary/10 blur-3xl" /><CardHeader className="relative flex-row items-start justify-between gap-3 pb-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><BadgeCheck /></span><div className="min-w-0"><CardTitle className="truncate text-sm">{title}</CardTitle><p className="mt-1 truncate text-[11px] text-muted-foreground">{issuerName}</p></div></div><Badge variant="outline" className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${statusClass}`}><span className="mr-1.5 size-1.5 rounded-full bg-current" />{statusLabel}</Badge></CardHeader><CardContent className="relative grid gap-3"><div className="flex flex-wrap gap-1.5">{sharedClaims.length > 0 ? sharedClaims.map((claim) => <Badge key={claim.key} variant="secondary" className="rounded-full px-2 py-1 text-[10px] font-normal">{t(language, claim.label)}</Badge>) : <span className="text-[11px] text-muted-foreground">{t(language, 'No claims are shared by default.')}</span>}</div><div className="flex items-center justify-between gap-2 border-t border-border/80 pt-3 text-[10px] text-muted-foreground"><span className="inline-flex min-w-0 items-center gap-1.5"><CalendarDays className="size-3.5 shrink-0" /><span>{t(language, 'Valid until')} {formatDate(credential.validUntil, 'd MMM yyyy')}</span></span><span className="inline-flex shrink-0 items-center gap-1 text-primary"><Check />{t(language, 'Shared by default')}</span></div>{showTechnical && <p className="truncate font-mono text-[9px] text-muted-foreground">Index {credential.statusListIndex} · {credential.id}</p>}<div className="flex flex-wrap items-center justify-between gap-2"><Link href={`/borrower/credentials/${credential.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">{t(language, 'Details')}<ChevronRight /></Link><div className="flex gap-2">{credential.status === 'expired' && onRenew && <Button size="xs" variant="outline" onClick={() => onRenew(credential)}>{t(language, 'Renew')}</Button>}{credential.status === 'active' && onRevoke && <ConfirmDialog title="Revoke this proof?" description="Lenders will fail the next status check. Existing disclosure receipts remain unchanged." confirmLabel="Revoke proof" trigger={<Button size="xs" variant="destructive">Revoke</Button>} onConfirm={onRevoke} />}</div></div></CardContent></Card>
}

export function BorrowerTxChip({ value, block, commitmentHash, children }: { value: string; block?: number; commitmentHash?: string; children?: ReactNode }) {
  function openDetails() {
    const existing = useDemoStore.getState().chainEvents.find((event) => event.txHash === value)
    openChainDetail(existing ?? {
      id: `receipt-${value}`,
      type: 'Public activity receipt',
      txHash: value,
      block: block ?? 0,
      timestamp: new Date().toISOString(),
      decoded: commitmentHash ? { commitmentHash } : {},
    })
  }

  return <button type="button" aria-label={`View public receipt ${value}`} onClick={openDetails} className="inline-flex max-w-full items-center gap-2 rounded-full border border-chain/25 bg-chain/10 px-3 py-1.5 text-[10px] font-medium text-chain transition hover:bg-chain/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><span className="size-1.5 shrink-0 rounded-full bg-chain" /><span className="truncate">{children ?? t('en', 'Recorded on-chain · no personal data')}</span></button>
}

export function DetailsSheet({ title, description, children, triggerLabel = 'Details' }: { title: string; description: string; children: ReactNode; triggerLabel?: string }) {
  return <Dialog><DialogTrigger render={<Button variant="outline" size="sm" />}><LockKeyhole data-icon="inline-start" />{triggerLabel}</DialogTrigger><DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-t-3xl border-border bg-surface"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><div className="grid gap-3">{children}</div></DialogContent></Dialog>
}

export function ValueChip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'danger' | 'violet' }) {
  const styles = { neutral: 'border-border bg-muted/60 text-muted-foreground', success: 'border-success/20 bg-success/10 text-success', danger: 'border-danger/20 bg-danger/10 text-danger', violet: 'border-chain/20 bg-chain/10 text-chain' }
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] ${styles[tone]}`}>{children}</span>
}

export function TechnicalKeyValue({ label, value }: { label: string; value: string | number }) {
  return <div className="grid gap-1 rounded-lg border border-border bg-background/70 p-3"><span className="text-[10px] text-muted-foreground">{label}</span><code className="break-all font-mono text-[10px] text-primary">{value}</code></div>
}
