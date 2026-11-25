import borrowers from '@/data/borrowers.json'
import credentials from '@/data/credentials.json'
import issuers from '@/data/issuers.json'
import lenders from '@/data/lenders.json'
import mandates from '@/data/mandates.json'
import runs from '@/data/runs.json'
import offers from '@/data/offers.json'
import activity from '@/data/activity.json'
import requests from '@/data/lender-requests.json'
import chainEvents from '@/data/chain-events.json'
import statusLists from '@/data/status-lists.json'
import policies from '@/data/policies.json'
import auditLog from '@/data/audit-log.json'
import attackScenarios from '@/data/attack-scenarios.json'
import admin from '@/data/admin.json'

import { z } from 'zod'
import { activitySchema, adminSchema, attackScenariosSchema, auditLogSchema, borrowersSchema, chainEventsSchema, credentialsSchema, issuersSchema, lenderRequestsSchema, lendersSchema, mandatesSchema, offersSchema, policiesSchema, runsSchema, statusListsSchema } from '@/lib/schemas'

function validateSeed<T>(name: string, schema: z.ZodType<T>, raw: unknown): T {
  if (process.env.NODE_ENV === 'development') {
    const result = schema.safeParse(raw)
    if (!result.success) {
      console.error(`[seed-data] Validation mismatch in data/${name}:`, result.error.issues)
      return raw as T
    }
    return result.data
  }
  return schema.parse(raw)
}

export const seedData = {
  borrowers: validateSeed('borrowers.json', borrowersSchema, borrowers),
  credentials: validateSeed('credentials.json', credentialsSchema, credentials),
  issuers: validateSeed('issuers.json', issuersSchema, issuers),
  lenders: validateSeed('lenders.json', lendersSchema, lenders),
  mandates: validateSeed('mandates.json', mandatesSchema, mandates),
  runs: validateSeed('runs.json', runsSchema, runs),
  offers: validateSeed('offers.json', offersSchema, offers),
  activity: validateSeed('activity.json', activitySchema, activity),
  lenderRequests: validateSeed('lender-requests.json', lenderRequestsSchema, requests),
  chainEvents: validateSeed('chain-events.json', chainEventsSchema, chainEvents),
  statusLists: validateSeed('status-lists.json', statusListsSchema, statusLists),
  policies: validateSeed('policies.json', policiesSchema, policies),
  auditLog: validateSeed('audit-log.json', auditLogSchema, auditLog),
  attackScenarios: validateSeed('attack-scenarios.json', attackScenariosSchema, attackScenarios),
  admin: validateSeed('admin.json', adminSchema, admin),
}
