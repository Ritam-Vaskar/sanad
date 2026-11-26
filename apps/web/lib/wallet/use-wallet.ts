/**
 * useWallet() — returns the active WalletProvider implementation.
 *
 * Selection logic (same as other groups in lib/api/index.ts):
 *   NEXT_PUBLIC_API_MODE=live  AND  NEXT_PUBLIC_LIVE_GROUPS contains 'wallet'
 *   → LiveWalletProvider
 *   otherwise → MockWalletProvider
 */

import { useMemo } from 'react'
import type { WalletProvider } from './types'
import { mockWallet } from './mock'
import { LiveWalletProvider } from './live'

function isLiveWallet(): boolean {
  if (process.env.NEXT_PUBLIC_API_MODE !== 'live') return false
  const groups = (process.env.NEXT_PUBLIC_LIVE_GROUPS ?? '')
    .split(',')
    .map((s) => s.trim())
  return groups.includes('wallet')
}

/** Stable singleton — does not change between renders. */
const liveWallet = new LiveWalletProvider()

export function useWallet(): WalletProvider {
  return useMemo<WalletProvider>(() => (isLiveWallet() ? liveWallet : mockWallet), [])
}
