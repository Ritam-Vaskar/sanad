'use client'

import { useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Copy, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import type { CredentialStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { openChainDetail } from '@/lib/chain-details'
import { useDemoStore } from '@/lib/store/demo-store'

const statusClasses: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20', verified: 'bg-success/10 text-success border-success/20', accepted: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20', expired: 'bg-muted text-muted-foreground border-border',
  revoked: 'bg-danger/10 text-danger border-danger/20', failed: 'bg-danger/10 text-danger border-danger/20', onchain: 'bg-chain/10 text-chain border-chain/20',
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-[11px] capitalize ${statusClasses[status.toLowerCase()] ?? ''}`}><span className="mr-1.5 size-1.5 rounded-full bg-current" />{label ?? status.replaceAll('_', ' ')}</Badge>
}

export function CopyButton({ value, label = 'Copy value' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); toast.success('Copied to clipboard'); window.setTimeout(() => setCopied(false), 1400) }
    catch { toast.error('Clipboard access is unavailable in this preview.') }
  }
  return <Button type="button" variant="ghost" size="icon-xs" aria-label={label} onClick={copy}>{copied ? <Check /> : <Copy />}</Button>
}

export function HashChip({ value, label = 'Hash' }: { value: string; label?: string }) {
  return <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground"><span className="shrink-0 text-foreground/70">{label}</span><span className="truncate">{value}</span><CopyButton value={value} label={`Copy ${label.toLowerCase()}`} /></span>
}

export function TxChip({ value, block }: { value: string; block?: number }) {
  function openDetails() {
    const event = useDemoStore.getState().chainEvents.find((item) => item.txHash === value) ?? {
      id: `transaction-${value}`,
      type: 'Transaction receipt',
      txHash: value,
      block: block ?? 0,
      timestamp: new Date().toISOString(),
      decoded: {},
    }
    openChainDetail(event)
  }

  return <button type="button" aria-label={`View transaction ${value}`} onClick={openDetails} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-chain/25 bg-chain/10 px-2.5 py-1 font-mono text-[11px] text-chain transition hover:bg-chain/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><span className="size-1.5 shrink-0 rounded-full bg-chain" /><span className="truncate">{value}</span></button>
}

export function StatCard({ label, value, change, icon, accent = 'teal' }: { label: string; value: number | string; change?: string; icon?: ReactNode; accent?: 'teal' | 'amber' | 'violet' }) {
  const reduced = useReducedMotion()
  const color = accent === 'amber' ? 'text-accent' : accent === 'violet' ? 'text-chain' : 'text-primary'
  return <motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}><Card className="border-border/80 bg-card/80"><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle><span className={color}>{icon}</span></CardHeader><CardContent><div className="text-2xl font-semibold tracking-tight">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</div>{change && <p className="mt-1 text-xs text-muted-foreground">{change}</p>}</CardContent></Card></motion.div>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface/60 p-6 text-center"><span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span><h3 className="text-sm font-medium">{title}</h3><p className="max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>{action}</div>
}

export function Skeletons({ rows = 3 }: { rows?: number }) {
  return <div className="grid gap-3" aria-label="Loading content">{Array.from({ length: rows }, (_, index) => <div key={index} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"><Skeleton className="size-10 rounded-xl" /><div className="grid flex-1 gap-2"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-2.5 w-2/3" /></div></div>)}</div>
}

export function JsonViewer({ value }: { value: unknown }) {
  return <pre className="max-h-72 overflow-auto rounded-xl border border-border bg-background/80 p-4 font-mono text-xs leading-5 text-primary/90">{JSON.stringify(value, null, 2)}</pre>
}

export function Gauge({ value, label, max = 100 }: { value: number; label: string; max?: number }) {
  const percent = Math.max(0, Math.min(100, value / max * 100))
  return <div className="flex items-center gap-3"><div className="relative grid size-14 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--primary) ${percent}%, var(--border) 0)` }}><div className="grid size-10 place-items-center rounded-full bg-card text-xs font-semibold">{value}</div></div><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{Math.round(percent)}% of policy limit</p></div></div>
}

export function BitmapGrid({ bits, label = 'Credential status bitmap' }: { bits: number[]; label?: string }) {
  return <div role="img" aria-label={`${label}: ${bits.filter(Boolean).length} revoked of ${bits.length} credentials`} className="grid w-fit grid-cols-[repeat(16,minmax(0,1fr))] gap-1">{bits.slice(0, 256).map((bit, index) => <span key={index} title={`Index ${index}: ${bit ? 'revoked' : 'active'}`} aria-label={`Index ${index}: ${bit ? 'revoked' : 'active'}`} className={`size-2.5 rounded-[3px] transition-colors duration-500 ${bit ? 'bg-danger' : 'bg-success/60'}`} />)}</div>
}

export function PipelineViz({ stages, activeIndex = -1, failedIndex = -1, failureRule, failureReason }: { stages: string[]; activeIndex?: number; failedIndex?: number; failureRule?: string; failureReason?: string }) {
  return <div className="grid gap-3"><ol aria-label="Verification pipeline stages" className="flex flex-wrap items-center gap-2">{stages.map((stage, index) => {
    const failed = failedIndex === index && activeIndex >= index
    const passed = index < activeIndex
    const active = index === activeIndex && !failed
    const tone = failed ? 'border-danger/35 bg-danger/10 text-danger' : passed ? 'border-success/30 bg-success/10 text-success' : active ? 'border-primary/35 bg-primary/10 text-primary' : 'border-border bg-muted/30 text-muted-foreground'
    return <li key={stage} className="flex items-center gap-2"><span aria-current={active || failed ? 'step' : undefined} className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors motion-reduce:transition-none ${tone} ${active ? 'motion-safe:animate-pulse' : ''}`}>{stage}</span>{index < stages.length - 1 && <span aria-hidden="true" className="text-muted-foreground">→</span>}</li>
  })}</ol>{failedIndex >= 0 && activeIndex >= failedIndex && <div role="status" className="rounded-lg border border-danger/25 bg-danger/[0.06] px-3 py-2 text-xs text-danger"><span className="font-semibold">Caught by: {failureRule}</span>{failureReason && <span className="ml-2 text-danger/80">{failureReason}</span>}</div>}</div>
}

export function StatusIcon({ status }: { status: CredentialStatus }) {
  return status === 'active' ? <Check className="size-3.5 text-success" /> : <X className="size-3.5 text-danger" />
}
