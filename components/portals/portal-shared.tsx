'use client'

import type { ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeletons } from '@/components/shared/primitives'

export function PortalQueryState({ loading, error, retry, children }: { loading: boolean; error: boolean; retry: () => void; children: ReactNode }) {
  if (loading) return <Skeletons rows={4} />
  if (error) return <Card role="alert" className="border-danger/30"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="size-4 text-danger" />Unable to load this workspace</CardTitle><CardDescription>The mock API did not return the portal data. Your shared records have not been changed.</CardDescription></CardHeader><CardContent><Button size="sm" variant="outline" onClick={retry}><RotateCcw data-icon="inline-start" />Try again</Button></CardContent></Card>
  return children
}

export function PortalHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action && <div className="shrink-0">{action}</div>}</div>
}

export function SectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">{title}</h2>{description && <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{description}</p>}</div>{action}</div>
}
