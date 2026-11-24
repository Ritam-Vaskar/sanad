'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, FlaskConical, RotateCcw, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { useDemoStore } from '@/lib/store/demo-store'
import type { DemoSpeed } from '@/types'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'

export function DemoPanel({ mobileOffset = false, inline = false, defaultOpen = false }: { mobileOffset?: boolean; inline?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const hydrated = useDemoStore((state) => state.hasHydrated)
  const personaId = useDemoStore((state) => state.personaId)
  const people = useDemoStore((state) => state.borrowers)
  const speed = useDemoStore((state) => state.speed)
  const showTechnical = useDemoStore((state) => state.showTechnical)
  const liveFeed = useDemoStore((state) => state.liveFeed)
  const setPersona = useDemoStore((state) => state.setPersona)
  const setSpeed = useDemoStore((state) => state.setSpeed)
  const setShowTechnical = useDemoStore((state) => state.setShowTechnical)
  const setLiveFeed = useDemoStore((state) => state.setLiveFeed)
  const resetDemo = useDemoStore((state) => state.resetDemo)
  const queryClient = useQueryClient()

  return <aside className={`${inline ? 'relative my-4' : mobileOffset ? 'sticky bottom-2 z-40 ml-3 mt-4 mb-2' : 'fixed bottom-3 left-3 z-40'} ${open ? (inline ? 'w-full' : mobileOffset ? 'w-[min(22rem,calc(100vw-2rem))]' : 'w-[min(22rem,calc(100vw-1.5rem))]') : 'w-12'} overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-2xl shadow-black/40 backdrop-blur-xl`} aria-label="Demo controls"><button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Collapse demo controls' : 'Open demo controls'} aria-expanded={open} className={`flex w-full items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${open ? 'justify-between px-4 py-3 text-left' : 'size-12 justify-center p-1'}`}><span className="flex items-center gap-2 text-xs font-semibold"><span className="grid size-6 place-items-center rounded-md bg-accent/10 text-accent"><FlaskConical className="size-3.5" /></span>{open && <>DEMO CONTROLS <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-primary">synthetic</span></>}</span>{open && <ChevronDown className="size-4 text-muted-foreground" />}</button>{open && <div className="grid gap-3 border-t border-border p-4">{!hydrated ? <Skeleton className="h-8 w-full" /> : <><label className="grid gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">Borrower persona<select value={personaId} onChange={(event) => setPersona(event.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-xs normal-case tracking-normal text-foreground">{people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.city.split(',')[0]}</option>)}</select></label><div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Zap className="size-3.5 text-accent" />Simulation speed</span><div className="flex gap-1">{([1, 2, 4] as DemoSpeed[]).map((value) => <Button key={value} size="xs" variant={speed === value ? 'secondary' : 'ghost'} onClick={() => setSpeed(value)}>{value}×</Button>)}</div></div><ToggleRow label="Show technical details" checked={showTechnical} onCheckedChange={setShowTechnical} /><ToggleRow label="Explorer live feed" checked={liveFeed} onCheckedChange={setLiveFeed} /><div className="flex flex-wrap gap-1.5 border-t border-border pt-3"><Link href="/borrower" className="rounded-md bg-muted px-2 py-1.5 text-[10px] text-foreground hover:bg-primary/10">1 · Passport</Link><Link href="/borrower/assistant" className="rounded-md bg-muted px-2 py-1.5 text-[10px] text-foreground hover:bg-primary/10">2 · Ask agent</Link><Link href="/borrower/activity" className="rounded-md bg-muted px-2 py-1.5 text-[10px] text-foreground hover:bg-primary/10">3 · Receipts</Link></div><Button variant="ghost" size="sm" className="justify-start text-danger hover:bg-danger/10 hover:text-danger" onClick={() => { window.localStorage.removeItem('sanad-demo-v1'); queryClient.clear(); resetDemo(); toast.success('Demo data reset to the Rahul seed persona.') }}><RotateCcw data-icon="inline-start" />Reset demo data</Button></>}</div>}</aside>
}

function ToggleRow({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center justify-between gap-3 text-xs text-muted-foreground">{label}<Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} /></label>
}
