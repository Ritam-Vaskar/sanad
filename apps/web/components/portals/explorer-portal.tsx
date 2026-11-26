'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, BadgeCheck, CalendarClock, FileCheck2, Landmark, Network, Search, ShieldCheck, ShieldX } from 'lucide-react'
import type { ChainEvent, Issuer, Lender } from '@/types'
import { useChain } from '@/lib/chain'
import { openChainDetail } from '@/lib/chain-details'
import { useDemoStore } from '@/lib/store/demo-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, StatCard, StatusBadge } from '@/components/shared/primitives'
import { PortalHeading, PortalQueryState, SectionHeading } from './portal-shared'

type ExplorerRow = { id: string; title: string; subtitle: string; status?: string; meta?: string; event: ChainEvent }

function publicDecoded(decoded: ChainEvent['decoded']) {
  return Object.fromEntries(Object.entries(decoded).filter(([key]) => /(?:id|hash|root)$/i.test(key)))
}

function eventForRecord(events: ChainEvent[], id: string, txHash: string | undefined, idField: string, label: string, relatedId = id): ChainEvent {
  return events.find((event) => event.decoded[idField] === relatedId) ?? events.find((event) => event.txHash === txHash) ?? {
    id: `record-${id}`,
    type: `${label} snapshot`,
    txHash: txHash ?? 'not-indexed',
    block: 0,
    timestamp: new Date().toISOString(),
    decoded: { [idField]: id },
  }
}

function formatTimestamp(value: string) {
  const time = Date.parse(value)
  return Number.isNaN(time) ? 'Unknown time' : new Date(time).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function ExplorerPortal() {
  const chain = useChain()
  const hydrated = useDemoStore((state) => state.hasHydrated)
  const storeEvents = useDemoStore((state) => state.chainEvents)
  const storeIssuers = useDemoStore((state) => state.issuers)
  const storeLenders = useDemoStore((state) => state.lenders)
  const mandates = useDemoStore((state) => state.mandates)
  const activity = useDemoStore((state) => state.activity)
  const liveFeed = useDemoStore((state) => state.liveFeed)
  const setLiveFeed = useDemoStore((state) => state.setLiveFeed)
  const simulateTampering = useDemoStore((state) => state.admin.simulateTampering)
  const [chainEvents, setChainEvents] = useState<ChainEvent[] | null>(null)
  const [chainIssuers, setChainIssuers] = useState<Issuer[] | null>(null)
  const [chainLenders, setChainLenders] = useState<Lender[] | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([chain.getEvents(), chain.getIssuers(), chain.getLenders()])
      .then(([ev, iss, len]) => {
        if (!active) return
        setChainEvents(ev)
        setChainIssuers(iss)
        setChainLenders(len)
      })
      .catch(() => {
        // Fallback to store data if chain reader fails or is a live stub
      })
    return () => { active = false }
  }, [chain, storeEvents, storeIssuers, storeLenders])

  const events = chainEvents ?? storeEvents
  const issuers = chainIssuers ?? storeIssuers
  const lenders = chainLenders ?? storeLenders
  const [search, setSearch] = useState('')
  const [eventType, setEventType] = useState('all')
  const [timeRange, setTimeRange] = useState('all')
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const knownIds = useRef<Set<string> | null>(null)

  useEffect(() => {
    const currentIds = new Set(events.map((event) => event.id))
    if (!knownIds.current) {
      knownIds.current = currentIds
      return
    }
    const newest = events.find((event) => !knownIds.current?.has(event.id))
    knownIds.current = currentIds
    if (!newest) return
    setHighlightedId(newest.id)
    const timeout = window.setTimeout(() => setHighlightedId((current) => current === newest.id ? null : current), 1600)
    return () => window.clearTimeout(timeout)
  }, [events])

  const receiptRows = useMemo(() => activity.filter((item) => Boolean(item.commitmentHash && item.lenderId)), [activity])
  const eventTypes = useMemo(() => Array.from(new Set(events.map((event) => event.type))).sort(), [events])
  const filteredEvents = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const latestEventTime = events.reduce((latest, event) => Math.max(latest, Date.parse(event.timestamp) || 0), 0)
    const cutoff = timeRange === 'day' ? latestEventTime - 86400000 : timeRange === 'week' ? latestEventTime - 7 * 86400000 : 0
    return [...events].filter((event) => {
      if (eventType !== 'all' && event.type !== eventType) return false
      if (cutoff && Date.parse(event.timestamp) < cutoff) return false
      const decoded = publicDecoded(event.decoded)
      const relatedMandates = mandates.filter((mandate) => mandate.txHash === event.txHash || mandate.id === event.decoded.mandateId || mandate.mandateHash === event.decoded.mandateHash)
      const relatedReceipts = receiptRows.filter((receipt) => receipt.txHash === event.txHash || receipt.requestId === event.decoded.requestId)
      const relatedIdentifiers = [...relatedMandates.map((mandate) => mandate.id), ...relatedReceipts.flatMap((receipt) => [receipt.lenderId, receipt.mandateId])]
      const searchable = `${event.id} ${event.type} ${event.txHash} ${Object.values(decoded).join(' ')} ${relatedIdentifiers.join(' ')}`.toLowerCase()
      return !needle || searchable.includes(needle)
    }).sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp))
  }, [eventType, events, mandates, receiptRows, search, timeRange])

  const issuerRows: ExplorerRow[] = issuers.map((issuer) => ({ id: issuer.id, title: issuer.name, subtitle: issuer.did, status: issuer.registryStatus, meta: issuer.keyHash, event: eventForRecord(events, issuer.id, undefined, 'issuerId', 'Issuer') }))
  const lenderRows: ExplorerRow[] = lenders.map((lender) => ({ id: lender.id, title: lender.name, subtitle: lender.did, status: lender.status, meta: lender.id, event: eventForRecord(events, lender.id, undefined, 'lenderId', 'Lender') }))
  const mandateRows: ExplorerRow[] = mandates.map((mandate) => ({ id: mandate.id, title: mandate.id, subtitle: `Expires ${formatTimestamp(mandate.expiresAt)}`, status: mandate.status, meta: mandate.txHash, event: eventForRecord(events, mandate.id, mandate.txHash, 'mandateId', 'Mandate') }))
  const receiptExplorerRows: ExplorerRow[] = receiptRows.map((receipt) => {
    const lender = lenders.find((item) => item.id === receipt.lenderId)
    return { id: receipt.id, title: lender?.name ?? receipt.lenderId ?? 'Unknown lender', subtitle: `Receipt ${receipt.id} · ${formatTimestamp(receipt.timestamp)}`, status: 'onchain', meta: receipt.commitmentHash, event: eventForRecord(events, receipt.id, receipt.txHash, 'requestId', 'Disclosure', receipt.requestId ?? receipt.id) }
  })
  const rootRows: ExplorerRow[] = events.filter((event) => event.type === 'StatusRootUpdated').map((event) => ({ id: event.id, title: String(event.decoded.issuerId ?? 'Status root'), subtitle: `Block ${event.block.toLocaleString('en-IN')} · ${formatTimestamp(event.timestamp)}`, status: 'onchain', meta: String(event.decoded.root ?? event.decoded.listHash ?? event.txHash), event }))
  const mandatesCreated = Math.max(mandates.length, events.filter((event) => ['MandateCreated', 'MandateRecorded'].includes(event.type)).length)
  const mandatesRevoked = Math.max(mandates.filter((mandate) => mandate.status === 'revoked').length, events.filter((event) => event.type === 'MandateRevoked').length)

  return <PortalQueryState loading={!hydrated} error={false} retry={() => { setSearch(''); setEventType('all'); setTimeRange('all') }}>
    <div className="grid gap-6">
      <PortalHeading eyebrow="Public trust network" title="SanadTrustRegistry Explorer" description="Inspect public registry events, consent receipts, and status roots on Base Sepolia. Borrower identity and private claims stay off-chain." action={<StatusBadge status="onchain" label="Base Sepolia · testnet" />} />
      <div id="live-feed" className="grid gap-3 rounded-2xl border border-chain/20 bg-chain/[0.045] p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-chain/20 bg-chain/10 text-chain"><ShieldCheck className="size-4" /></span><div><p className="text-xs font-semibold text-chain">No personal data is ever stored on-chain</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Only issuer, lender, mandate, status-root and salted commitment identifiers are indexed.</p></div></div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end"><StatusBadge status={simulateTampering ? 'failed' : 'verified'} label={simulateTampering ? 'Audit chain check failed' : 'Audit chain verified'} /><label className="flex items-center gap-2 rounded-full border border-chain/20 bg-background/70 px-3 py-2 text-[11px] text-chain"><span>Live feed</span><Switch checked={liveFeed} onCheckedChange={setLiveFeed} aria-label="Toggle live chain event feed" /></label></div>
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Issuers" value={issuers.length} icon={<BadgeCheck />} accent="violet" />
        <StatCard label="Lenders" value={lenders.length} icon={<Landmark />} accent="violet" />
        <StatCard label="Mandates created" value={mandatesCreated} icon={<FileCheck2 />} accent="violet" />
        <StatCard label="Mandates revoked" value={mandatesRevoked} icon={<ShieldX />} accent="violet" />
        <StatCard label="Disclosure receipts" value={receiptRows.length} icon={<Activity />} accent="violet" />
      </div>
      <Card className="border-chain/15 bg-card/80">
        <CardHeader className="gap-4">
          <SectionHeading title="Public network records" description="Search a transaction hash, mandate ID, or lender ID. Select any row to inspect its public chain details." />
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_190px_150px]">
            <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-chain" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Transaction hash, mandate ID, lender ID" aria-label="Search transaction hash, mandate ID, or lender ID" className="border-chain/20 pl-9 focus-visible:ring-chain/35" /></label>
            <label className="sr-only" htmlFor="explorer-event-type">Filter by event type</label><select id="explorer-event-type" value={eventType} onChange={(event) => setEventType(event.target.value)} className="h-9 rounded-md border border-chain/20 bg-background px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-chain/40"><option value="all">All event types</option>{eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
            <label className="sr-only" htmlFor="explorer-time-range">Filter by time</label><select id="explorer-time-range" value={timeRange} onChange={(event) => setTimeRange(event.target.value)} className="h-9 rounded-md border border-chain/20 bg-background px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-chain/40"><option value="all">All time</option><option value="day">Last 24 hours</option><option value="week">Last 7 days</option></select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="events" className="grid gap-4">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-background/70 p-1">
              <TabsTrigger value="events">All events <span className="ml-1 text-[10px] text-muted-foreground">{filteredEvents.length}</span></TabsTrigger>
              <TabsTrigger value="issuers">Issuers</TabsTrigger><TabsTrigger value="lenders">Lenders</TabsTrigger><TabsTrigger value="mandates">Mandates</TabsTrigger><TabsTrigger value="receipts">Receipts</TabsTrigger><TabsTrigger value="roots">Status roots</TabsTrigger>
            </TabsList>
            <TabsContent value="events" className="mt-0"><div className="grid gap-2">{filteredEvents.length ? filteredEvents.map((event) => <EventRow key={event.id} event={event} highlighted={event.id === highlightedId} />) : <EmptyState title="No matching events" description="Try another identifier, event type, or time range." />}</div></TabsContent>
            <TabsContent value="issuers" className="mt-0"><RecordList rows={issuerRows} emptyTitle="No issuers registered" /></TabsContent>
            <TabsContent value="lenders" className="mt-0"><RecordList rows={lenderRows} emptyTitle="No lenders registered" /></TabsContent>
            <TabsContent value="mandates" className="mt-0"><RecordList rows={mandateRows} emptyTitle="No mandates created" /></TabsContent>
            <TabsContent value="receipts" className="mt-0"><RecordList rows={receiptExplorerRows} emptyTitle="No disclosure receipts yet" /></TabsContent>
            <TabsContent value="roots" className="mt-0"><RecordList rows={rootRows} emptyTitle="No status roots published" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Card className="border-chain/15 bg-chain/[0.025]"><CardHeader><CardTitle className="flex items-center gap-2 text-sm text-chain"><Network className="size-4" />Public chain index</CardTitle></CardHeader><CardContent className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3"><p className="flex items-center gap-2"><Activity className="size-3.5 text-chain" />{events.length} indexed events</p><p className="flex items-center gap-2"><CalendarClock className="size-3.5 text-chain" />Updated as shared demo actions occur</p><p className="flex items-center gap-2"><ShieldCheck className="size-3.5 text-chain" />Decoded data is restricted to public identifiers and hashes</p></CardContent></Card>
    </div>
  </PortalQueryState>
}

function EventRow({ event, highlighted }: { event: ChainEvent; highlighted: boolean }) {
  const decoded = Object.entries(publicDecoded(event.decoded))
  return <button type="button" onClick={() => openChainDetail(event)} aria-label={`Open ${event.type} event in block ${event.block}`} className={`grid w-full gap-2 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chain sm:grid-cols-[minmax(130px,0.8fr)_90px_minmax(160px,1.2fr)_minmax(155px,1fr)] sm:items-center ${highlighted ? 'border-chain/35 bg-chain/15 ring-1 ring-chain/20 motion-safe:animate-pulse' : 'border-border/70 bg-background/45 hover:border-chain/25 hover:bg-chain/[0.045]'}`}>
    <span className="flex min-w-0 items-center gap-2"><StatusBadge status="onchain" label={event.type} /></span>
    <span className="text-[11px] text-muted-foreground">Block <span className="font-mono text-foreground">{event.block.toLocaleString('en-IN')}</span></span>
    <span className="min-w-0 truncate font-mono text-[10px] text-chain">{decoded.length ? decoded.map(([key, value]) => `${key}: ${value}`).join(' · ') : 'Public event metadata'}</span>
    <span className="flex min-w-0 items-center justify-between gap-2"><span className="truncate text-[10px] text-muted-foreground">{formatTimestamp(event.timestamp)}</span><span className="max-w-28 truncate font-mono text-[9px] text-chain/80">{event.txHash}</span></span>
  </button>
}

function RecordList({ rows, emptyTitle }: { rows: ExplorerRow[]; emptyTitle: string }) {
  if (!rows.length) return <EmptyState title={emptyTitle} description="Records will appear here as the trust network is used." />
  return <div className="grid gap-2">{rows.map((row) => <button key={row.id} type="button" onClick={() => openChainDetail(row.event)} aria-label={`Open public details for ${row.title}`} className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/45 px-3 py-3 text-left transition hover:border-chain/25 hover:bg-chain/[0.045] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chain">
    <span className="min-w-0"><span className="block truncate text-xs font-medium">{row.title}</span><span className="mt-1 block truncate text-[10px] text-muted-foreground">{row.subtitle}</span>{row.meta && <span className="mt-1 block truncate font-mono text-[9px] text-chain">{row.meta}</span>}</span>
    <span className="shrink-0">{row.status && <StatusBadge status={row.status} />}</span>
  </button>)}</div>
}
