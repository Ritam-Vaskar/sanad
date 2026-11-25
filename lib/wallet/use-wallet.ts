'use client'

import { useMemo } from 'react'
import { MockWalletProvider } from './mock'
import { LiveWalletProvider } from './live'
import type { WalletProvider } from './types'

function isLiveWallet(): boolean {
  const mode = process.env.NEXT_PUBLIC_API_MODE
  const groups = process.env.NEXT_PUBLIC_LIVE_GROUPS ?? ''
  return mode === 'live' || groups.split(',').map((g) => g.trim()).includes('wallet')
}

/**
 * useWallet() — returns the active WalletProvider implementation.
 * In mock mode (default) this is MockWalletProvider (identical to pre-C6 behaviour).
 * When NEXT_PUBLIC_LIVE_GROUPS includes 'wallet', LiveWalletProvider is returned.
 *
 * The provider instance is memoised so callers receive a stable reference.
 */
export function useWallet(): WalletProvider {
  return useMemo<WalletProvider>(
    () => (isLiveWallet() ? new LiveWalletProvider() : new MockWalletProvider()),
    // env values are build-time constants; memo never needs to re-run
    [],
  )
}
