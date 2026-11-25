'use client'

import { useMemo } from 'react'
import { MockChainReader } from './mock'
import { EthersChainReader } from './ethers'
import type { ChainReader } from './types'

function isLiveChain(): boolean {
  const mode = process.env.NEXT_PUBLIC_API_MODE
  const groups = process.env.NEXT_PUBLIC_LIVE_GROUPS ?? ''
  return mode === 'live' || groups.split(',').map((g) => g.trim()).includes('chain')
}

/**
 * useChain() — returns the active ChainReader implementation.
 * Default: MockChainReader (Zustand store, identical to pre-C6 Explorer behaviour).
 * Live:    EthersChainReader when NEXT_PUBLIC_LIVE_GROUPS includes 'chain'.
 */
export function useChain(): ChainReader {
  return useMemo<ChainReader>(
    () => (isLiveChain() ? new EthersChainReader() : new MockChainReader()),
    [],
  )
}
