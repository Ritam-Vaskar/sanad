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

import { activitySchema, adminSchema, attackScenariosSchema, auditLogSchema, borrowersSchema, chainEventsSchema, credentialsSchema, issuersSchema, lenderRequestsSchema, lendersSchema, mandatesSchema, offersSchema, policiesSchema, runsSchema, statusListsSchema } from '@/data/schemas'

export const seedData = {
  borrowers: borrowersSchema.parse(borrowers),
  credentials: credentialsSchema.parse(credentials),
  issuers: issuersSchema.parse(issuers),
  lenders: lendersSchema.parse(lenders),
  mandates: mandatesSchema.parse(mandates),
  runs: runsSchema.parse(runs),
  offers: offersSchema.parse(offers),
  activity: activitySchema.parse(activity),
  lenderRequests: lenderRequestsSchema.parse(requests),
  chainEvents: chainEventsSchema.parse(chainEvents),
  statusLists: statusListsSchema.parse(statusLists),
  policies: policiesSchema.parse(policies),
  auditLog: auditLogSchema.parse(auditLog),
  attackScenarios: attackScenariosSchema.parse(attackScenarios),
  admin: adminSchema.parse(admin),
}
