'use client'

import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const config = { score: { label: 'Risk contribution', color: 'var(--primary)' } } satisfies ChartConfig

type RiskFactor = { label: string; score: number }

export function RiskBreakdownChart({ rows }: { rows: RiskFactor[] }) {
  const data = rows.map((row) => ({ label: row.label.replace('Income consistency', 'Consistency').replace('Active months', 'History').replace('Existing obligations', 'Obligations'), score: row.score }))
  return <ChartContainer config={config} className="h-[190px] min-h-0 w-full"><BarChart accessibilityLayer data={data} margin={{ top: 8, right: 6, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} interval={0} tick={{ fontSize: 10 }} /><ChartTooltip content={<ChartTooltipContent hideLabel />} /><Bar dataKey="score" fill="var(--color-score)" radius={5} maxBarSize={42} /></BarChart></ChartContainer>
}
