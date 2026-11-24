'use client'

import { useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState } from '@/components/shared/primitives'

type Column<T> = { key: keyof T; label: string; render?: (row: T) => ReactNode }

export function BottomSheet({ title, description, trigger, children }: { title: string; description: string; trigger: ReactElement; children: ReactNode }) {
  return <Sheet><SheetTrigger render={trigger} /><SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-border bg-surface"><SheetHeader className="mx-auto w-full max-w-xl text-left"><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader><div className="mx-auto mt-5 w-full max-w-xl">{children}</div></SheetContent></Sheet>
}

export function ConfirmDialog({ title, description, confirmLabel = 'Confirm', trigger, onConfirm, children, confirmDisabled = false }: { title: string; description: string; confirmLabel?: string; trigger: ReactElement; onConfirm: () => void; children?: ReactNode; confirmDisabled?: boolean }) {
  return <Dialog><DialogTrigger render={trigger} /><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{children}<DialogFooter><DialogClose render={<Button variant="outline" />}>Cancel</DialogClose><DialogClose render={<Button variant="destructive" onClick={onConfirm} disabled={confirmDisabled} />}>{confirmLabel}</DialogClose></DialogFooter></DialogContent></Dialog>
}

export function DataTable<T extends Record<string, unknown>>({ rows, columns, pageSize = 5 }: { rows: T[]; columns: Column<T>[]; pageSize?: number }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null)
  const [page, setPage] = useState(0)
  const filtered = useMemo(() => rows.filter((row) => columns.some((column) => String(row[column.key] ?? '').toLowerCase().includes(query.toLowerCase()))), [rows, columns, query])
  const ordered = useMemo(() => {
    if (!sort) return filtered
    return [...filtered].sort((a, b) => String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), 'en', { numeric: true }) * (sort.direction === 'asc' ? 1 : -1))
  }, [filtered, sort])
  const pages = Math.max(1, Math.ceil(ordered.length / pageSize))
  const visible = ordered.slice(page * pageSize, (page + 1) * pageSize)
  return <div className="grid gap-3"><label className="relative block max-w-xs"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder="Filter rows" className="pl-9" aria-label="Filter table rows" /></label>{ordered.length === 0 ? <EmptyState title={query ? 'No matching records' : 'Nothing to show yet'} description={query ? 'Try a different search term or clear the filter.' : 'Records will appear here when they are available.'} /> : <div className="overflow-hidden rounded-xl border border-border"><Table><TableHeader><TableRow>{columns.map((column) => <TableHead key={String(column.key)}><button type="button" className="inline-flex items-center gap-1.5 hover:text-foreground" onClick={() => setSort((current) => current?.key === column.key ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key: column.key, direction: 'asc' })}>{column.label}<ChevronDown className={`size-3 transition-transform ${sort?.key === column.key && sort.direction === 'asc' ? 'rotate-180' : ''}`} /></button></TableHead>)}</TableRow></TableHeader><TableBody>{visible.map((row, index) => <TableRow key={String(row.id ?? index)}>{columns.map((column) => <TableCell key={String(column.key)}>{column.render ? column.render(row) : String(row[column.key] ?? '—')}</TableCell>)}</TableRow>)}</TableBody></Table></div>}<div className="flex items-center justify-between text-xs text-muted-foreground"><span>{ordered.length} records · page {page + 1} of {pages}</span><div className="flex gap-1"><Button variant="outline" size="icon-xs" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}><ChevronLeft /></Button><Button variant="outline" size="icon-xs" aria-label="Next page" disabled={page + 1 >= pages} onClick={() => setPage((current) => Math.min(pages - 1, current + 1))}><ChevronRight /></Button></div></div></div>
}
