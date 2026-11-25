import { describe, it, expect } from 'vitest'
import { calculateEmi, buildAmortizationSchedule } from '@/lib/emi'

describe('calculateEmi', () => {
  it('returns 0 for zero principal', () => {
    expect(calculateEmi(0, 12, 12)).toBe(0)
  })

  it('returns 0 for zero tenure', () => {
    expect(calculateEmi(50000, 12, 0)).toBe(0)
  })

  it('handles 0% interest rate (simple division)', () => {
    const emi = calculateEmi(12000, 0, 12)
    expect(emi).toBeCloseTo(1000, 2)
  })

  it('computes a standard EMI correctly', () => {
    // ₹50,000 at 12% pa for 12 months → ~₹4,442.44
    const emi = calculateEmi(50000, 12, 12)
    expect(emi).toBeCloseTo(4442.44, 1)
  })

  it('total repayment equals principal + interest', () => {
    const principal = 100000
    const emi = calculateEmi(principal, 18, 24)
    const total = emi * 24
    expect(total).toBeGreaterThan(principal)
    // sanity: not too far off
    expect(total).toBeLessThan(principal * 1.5)
  })
})

describe('buildAmortizationSchedule', () => {
  it('has correct row count', () => {
    const rows = buildAmortizationSchedule(50000, 12, 12)
    expect(rows).toHaveLength(12)
  })

  it('month numbers are 1-indexed sequential', () => {
    const rows = buildAmortizationSchedule(50000, 12, 6)
    expect(rows.map((r) => r.month)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('first row opening balance equals principal', () => {
    const rows = buildAmortizationSchedule(50000, 12, 12)
    expect(rows[0].openingBalance).toBeCloseTo(50000, 1)
  })

  it('last row closing balance is effectively zero', () => {
    const rows = buildAmortizationSchedule(50000, 12, 12)
    expect(rows[rows.length - 1].closingBalance).toBeCloseTo(0, 0)
  })

  it('interest decreases monotonically (reducing balance)', () => {
    const rows = buildAmortizationSchedule(50000, 12, 12)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].interest).toBeLessThan(rows[i - 1].interest)
    }
  })

  it('payment = principal + interest in each row', () => {
    const rows = buildAmortizationSchedule(30000, 15, 6)
    for (const row of rows) {
      expect(row.payment).toBeCloseTo(row.principal + row.interest, 5)
    }
  })

  it('handles negative-principal edge without throwing', () => {
    // calculateEmi returns 0 for principal <= 0, but the schedule still runs
    // using the opening balance of -1. We just assert it doesn't throw.
    expect(() => buildAmortizationSchedule(-1, 12, 3)).not.toThrow()
    const rows = buildAmortizationSchedule(-1, 12, 3)
    expect(rows).toHaveLength(3)
  })
})
