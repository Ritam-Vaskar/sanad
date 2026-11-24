'use client'

import { useDemoStore } from '@/lib/store/demo-store'
import { getMessages } from './index'

export function useMessages() {
  const language = useDemoStore((state) => state.language)
  return getMessages(language)
}
