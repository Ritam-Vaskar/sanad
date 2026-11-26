'use client'

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const issuanceConfig = { issued: { label: 'Issued', color: 'var(--chart-1)' } } satisfies ChartConfig
const requestsConfig = { requests: { label: 'Requests', color: 'var(--chart-3)' } } satisfies ChartConfig
const funnelConfig = { count: { label: 'Requests', color: 'var(--chart-1)' } } satisfies ChartConfig

export function IssuanceAreaChart() {
  const data = [{ month: 'Jun', issued: 22 }, { month: 'Jul', issued: 34 }, { month: 'Aug', issued: 29 }, { month: 'Sep', issued: 46 }, { month: 'Oct', issued: 52 }, { month: 'Nov', issued: 61 }]
  return <ChartContainer config={issuanceConfig} className="aspect-auto h-56 w-full"><AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 10, top: 12 }}><defs><linearGradient id="issuance-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-issued)" stopOpacity={0.28} /><stop offset="95%" stopColor="var(--color-issued)" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={10} /><YAxis axisLine={false} tickLine={false} width={28} /><Tooltip content={<ChartTooltipContent />} /><Area type="monotone" dataKey="issued" stroke="var(--color-issued)" fill="url(#issuance-fill)" strokeWidth={2} /></AreaChart></ChartContainer>
}

export function RequestsAreaChart() {
  const data = [{ day: '18 Nov', requests: 8 }, { day: '19 Nov', requests: 12 }, { day: '20 Nov', requests: 10 }, { day: '21 Nov', requests: 15 }, { day: '22 Nov', requests: 13 }, { day: '23 Nov', requests: 19 }, { day: '24 Nov', requests: 23 }]
  return <ChartContainer config={requestsConfig} className="aspect-auto h-56 w-full"><AreaChart accessibilityLayer data={data} margin={{ left: 4, right: 10, top: 12 }}><defs><linearGradient id="requests-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-requests)" stopOpacity={0.25} /><stop offset="95%" stopColor="var(--color-requests)" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="day" axisLine={false} tickLine={false} tickMargin={10} /><YAxis axisLine={false} tickLine={false} width={28} /><Tooltip content={<ChartTooltipContent />} /><Area type="monotone" dataKey="requests" stroke="var(--color-requests)" fill="url(#requests-fill)" strokeWidth={2} /></AreaChart></ChartContainer>
}

export function FunnelChart({ verified, offered, accepted }: { verified: number; offered: number; accepted: number }) {
  const data = [{ stage: 'Requests', count: Math.max(verified, offered, accepted, 12) }, { stage: 'Verified', count: verified }, { stage: 'Offered', count: offered }, { stage: 'Accepted', count: accepted }]
  return <ChartContainer config={funnelConfig} className="aspect-auto h-56 w-full"><BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 6, right: 10, top: 8, bottom: 8 }}><CartesianGrid horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="stage" axisLine={false} tickLine={false} width={74} /><Tooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="var(--color-count)" radius={[0, 6, 6, 0]} barSize={18} /></BarChart></ChartContainer>
}
