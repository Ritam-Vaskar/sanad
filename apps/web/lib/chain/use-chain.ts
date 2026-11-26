/**
 * useChain() — returns the active ChainReader implementation.
 *
 * Selection (same env flags as lib/api/index.ts):
 *   NEXT_PUBLIC_API_MODE=live  AND  NEXT_PUBLIC_LIVE_GROUPS contains 'chain'
 *   → EthersChainReader
 *   otherwise → MockChainReader
 */

import { useMemo } from 'react'
import type { ChainReader } from './types'
import { mockChainReader } from './mock'
import { EthersChainReader } from './ethers'

function isLiveChain(): boolean {
  if (process.env.NEXT_PUBLIC_API_MODE !== 'live') return false
  const groups = (process.env.NEXT_PUBLIC_LIVE_GROUPS ?? '')
    .split(',')
    .map((s) => s.trim())
  return groups.includes('chain')
}

const liveChainReader = new EthersChainReader()

export function useChain(): ChainReader {
  return useMemo<ChainReader>(() => (isLiveChain() ? liveChainReader : mockChainReader), [])
}
