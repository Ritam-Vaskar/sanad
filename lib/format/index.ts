import { format, formatDistanceToNow } from 'date-fns'

export function formatINR(value: number, options: { decimals?: number; compact?: boolean } = {}) {
  if (options.compact && Math.abs(value) >= 100000) return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1, notation: 'compact' }).format(value)}`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: options.decimals ?? 0, minimumFractionDigits: options.decimals ?? 0 }).format(value)
}

export function formatDate(value: string | Date, pattern = 'd MMM yyyy') {
  return format(new Date(value), pattern)
}

export function shortHash(value: string, size = 6) {
  if (value.length <= size * 2 + 3) return value
  return `${value.slice(0, size + 2)}…${value.slice(-size)}`
}

export function timeAgo(value: string | Date) {
  return formatDistanceToNow(new Date(value), { addSuffix: true })
}
