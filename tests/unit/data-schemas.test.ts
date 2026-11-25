/**
 * Validates every JSON file in data/ against its Zod schema.
 * Uses the same dataFileSchemas map that seed-data.ts uses at startup in dev.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dataFileSchemas } from '@/data/schemas'

const DATA_DIR = join(process.cwd(), 'data')

describe('data/ JSON files pass their Zod schemas', () => {
  for (const [filename, schema] of Object.entries(dataFileSchemas)) {
    it(filename, () => {
      const raw: unknown = JSON.parse(
        readFileSync(join(DATA_DIR, filename), 'utf-8'),
      )
      const result = schema.safeParse(raw)
      if (!result.success) {
        // Log the first error for debuggability
        const firstIssue = result.error.issues[0]
        throw new Error(
          `${filename}: ${firstIssue.message} at path [${firstIssue.path.join('.')}]`,
        )
      }
      expect(result.success).toBe(true)
    })
  }
})
