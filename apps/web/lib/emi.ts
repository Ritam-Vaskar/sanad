export type AmortizationRow = { month: number; openingBalance: number; principal: number; interest: number; payment: number; closingBalance: number }

export function calculateEmi(principal: number, annualRatePercent: number, tenureMonths: number) {
  if (principal <= 0 || tenureMonths <= 0) return 0
  const monthlyRate = annualRatePercent / 1200
  if (monthlyRate === 0) return principal / tenureMonths
  const factor = (1 + monthlyRate) ** tenureMonths
  return principal * monthlyRate * factor / (factor - 1)
}

export function buildAmortizationSchedule(principal: number, annualRatePercent: number, tenureMonths: number): AmortizationRow[] {
  const payment = calculateEmi(principal, annualRatePercent, tenureMonths)
  const monthlyRate = annualRatePercent / 1200
  let balance = principal
  return Array.from({ length: tenureMonths }, (_, index) => {
    const interest = balance * monthlyRate
    const principalPaid = Math.min(balance, payment - interest)
    const openingBalance = balance
    balance = Math.max(0, balance - principalPaid)
    return { month: index + 1, openingBalance, principal: principalPaid, interest, payment: principalPaid + interest, closingBalance: balance }
  })
}
