'use client'

import { useEffect, useState } from 'react'
import { Copy, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import type { ChainEvent } from '@/types'
import { CopyButton, StatusBadge } from '@/components/shared/primitives'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

function decodedIdentifiers(event: ChainEvent) {
  return Object.entries(event.decoded).filter(([key]) => /(?:id|hash|root)$/i.test(key))
}

export function ChainDetailsDrawer() {
  const [event, setEvent] = useState<ChainEvent | null>(null)

  async function copyReceiptHash() {
    if (!event) return
    try {
      await navigator.clipboard.writeText(event.txHash)
      toast.success('Receipt hash copied.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not copy the receipt hash.')
    }
  }

  useEffect(() => {
    const handleOpen = (customEvent: Event) => setEvent((customEvent as CustomEvent<ChainEvent>).detail)
    window.addEventListener('sanad:chain-detail', handleOpen)
    return () => window.removeEventListener('sanad:chain-detail', handleOpen)
  }, [])

  return <Sheet open={Boolean(event)} onOpenChange={(open) => { if (!open) setEvent(null) }}>
    <SheetContent side="right" className="w-full overflow-y-auto border-chain/20 bg-surface sm:max-w-md">
      {event && <>
        <SheetHeader className="border-b border-border/80 pb-4 pr-12">
          <div className="flex items-center gap-2 text-chain"><ShieldCheck className="size-4" /><StatusBadge status="onchain" label="Public chain record" /></div>
          <SheetTitle className="pt-1">{event.type}</SheetTitle>
          <SheetDescription>Decoded identifiers and commitment hashes only. No borrower claims or personal data are shown.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 pb-6">
          <section aria-label="Transaction details" className="grid gap-3 rounded-xl border border-chain/20 bg-chain/[0.04] p-3">
            <DetailField label="Transaction hash" value={event.txHash} />
            <DetailField label="Block" value={event.block > 0 ? event.block.toLocaleString('en-IN') : 'Not indexed'} />
            <DetailField label="Time" value={Number.isNaN(Date.parse(event.timestamp)) ? 'Unknown' : new Date(event.timestamp).toLocaleString('en-IN')} />
          </section>
          <section aria-labelledby="decoded-fields-title" className="grid gap-2">
            <h3 id="decoded-fields-title" className="text-xs font-semibold">Decoded fields</h3>
            {decodedIdentifiers(event).length ? decodedIdentifiers(event).map(([key, value]) => <DetailField key={key} label={key} value={String(value)} />) : <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">No public identifiers were decoded for this record.</p>}
          </section>
          <Button variant="outline" className="border-chain/25 text-chain hover:bg-chain/10" onClick={() => void copyReceiptHash()}>
            <Copy data-icon="inline-start" />Copy receipt hash
          </Button>
        </div>
      </>}
    </SheetContent>
  </Sheet>
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/55 px-3 py-2">
    <div className="min-w-0"><p className="text-[10px] text-muted-foreground">{label}</p><code className="block break-all font-mono text-[11px] text-chain">{value}</code></div>
    <CopyButton value={value} label={`Copy ${label}`} />
  </div>
}
