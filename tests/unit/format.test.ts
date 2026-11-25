import { describe, it, expect } from 'vitest'
import { formatINR, formatDate, shortHash, timeAgo } from '@/lib/format'

describe('formatINR', () => {
  it('formats zero', () => {
    const result = formatINR(0)
    expect(result).toMatch(/0/)
  })

  it('formats a whole number without decimals by default', () => {
    const result = formatINR(50000)
    // en-IN: ₹50,000
    expect(result).toMatch(/50,000/)
    expect(result).toMatch(/₹/)
  })

  it('formats with 2 decimal places when specified', () => {
    const result = formatINR(1234.5, { decimals: 2 })
    expect(result).toMatch(/1,234\.50/)
  })

  it('compact mode abbreviates lakhs', () => {
    const result = formatINR(100000, { compact: true })
    expect(result).toMatch(/1/)
    expect(result).toMatch(/L|lakh|lac|la/i)
  })

  it('compact mode does not abbreviate below 1 lakh', () => {
    const result = formatINR(99999, { compact: true })
    // compact is false below 1 lakh, falls through to full format
    expect(result).toMatch(/99,999/)
  })

  it('handles negative values', () => {
    const result = formatINR(-5000)
    expect(result).toMatch(/5,000/)
  })
})

describe('formatDate', () => {
  it('formats an ISO date string to default pattern', () => {
    const result = formatDate('2026-01-15T00:00:00.000Z')
    // d MMM yyyy → "15 Jan 2026"
    expect(result).toMatch(/Jan|15/)
  })

  it('formats with a custom pattern', () => {
    const result = formatDate('2026-06-01T00:00:00.000Z', 'yyyy-MM-dd')
    expect(result).toBe('2026-06-01')
  })

  it('accepts a Date object', () => {
    const d = new Date('2026-03-20T00:00:00.000Z')
    const result = formatDate(d, 'yyyy')
    expect(result).toBe('2026')
  })
})

describe('shortHash', () => {
  it('leaves short strings unchanged', () => {
    expect(shortHash('abc123', 6)).toBe('abc123')
  })

  it('truncates long strings with ellipsis', () => {
    const hash = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
    const result = shortHash(hash)
    expect(result.length).toBeLessThan(hash.length)
    expect(result).toMatch(/…/)
    expect(result).toContain('0x71C7')
  })

  it('respects custom size', () => {
    const hash = '0xdeadbeefdeadbeefdeadbeef'
    const result = shortHash(hash, 3)
    expect(result).toMatch(/…/)
  })
})

describe('timeAgo', () => {
  it('returns a relative string for a recent date', () => {
    const recent = new Date(Date.now() - 60_000).toISOString()
    const result = timeAgo(recent)
    expect(result).toMatch(/minute|ago/i)
  })

  it('accepts a Date object', () => {
    const result = timeAgo(new Date(Date.now() - 3600_000))
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
