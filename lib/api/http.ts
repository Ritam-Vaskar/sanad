/**
 * Typed fetch wrapper for live API calls.
 *
 * Features:
 * - Configurable timeout (default 15 s)
 * - Auth header support (Bearer token)
 * - Standard error shape { code, message, rule? }
 * - Zod parsing of every response
 * - PolicyDenied error carrying the rule name for UI rule chips
 */

import type { z } from 'zod'

// ── error types ──────────────────────────────────────────────────────────────

export interface ApiErrorBody {
  code: string
  message: string
  rule?: string
}

export class ApiError extends Error {
  code: string
  status: number
  rule?: string

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.code = body.code
    this.status = status
    this.rule = body.rule
  }
}

export class PolicyDenied extends ApiError {
  override rule: string

  constructor(status: number, body: ApiErrorBody & { rule: string }) {
    super(status, body)
    this.name = 'PolicyDenied'
    this.rule = body.rule
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends Error {
  constructor(url: string) {
    super(`Request to ${url} timed out.`)
    this.name = 'TimeoutError'
  }
}

// ── config ───────────────────────────────────────────────────────────────────

export interface HttpClientConfig {
  baseUrl: string
  timeout?: number
  authToken?: string
  headers?: Record<string, string>
}

export interface RequestOptions<T = unknown> {
  body?: unknown
  schema?: z.ZodType<T>
  query?: Record<string, string | number | boolean | undefined>
  headers?: Record<string, string>
  timeoutMs?: number
}

// ── client ───────────────────────────────────────────────────────────────────

export function createHttpClient(config: HttpClientConfig) {
  const { baseUrl, timeout = 15_000, authToken, headers: extraHeaders } = config

  async function request<T>(
    method: string,
    path: string,
    options: RequestOptions<T> = {},
  ): Promise<T> {
    const url = new URL(path, baseUrl)
    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined) url.searchParams.set(key, String(value))
      }
    }

    const controller = new AbortController()
    const ms = options.timeoutMs ?? timeout
    const timer = setTimeout(() => controller.abort(), ms)

    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extraHeaders,
      ...options.headers,
    }
    if (authToken) fetchHeaders['Authorization'] = `Bearer ${authToken}`

    let response: Response
    try {
      response = await fetch(url.toString(), {
        method,
        headers: fetchHeaders,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timer)
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new TimeoutError(url.toString())
      }
      throw new NetworkError(
        err instanceof Error ? err.message : 'Network request failed.',
      )
    } finally {
      clearTimeout(timer)
    }

    // Error responses
    if (!response.ok) {
      let body: ApiErrorBody
      try {
        body = (await response.json()) as ApiErrorBody
      } catch {
        body = {
          code: `HTTP_${response.status}`,
          message: response.statusText || 'Unknown error',
        }
      }
      if (!body.code) body.code = `HTTP_${response.status}`
      if (!body.message) body.message = 'Unknown error'

      // Policy denials carry a rule name for the UI
      if (body.rule) {
        throw new PolicyDenied(response.status, body as ApiErrorBody & { rule: string })
      }
      throw new ApiError(response.status, body)
    }

    // 204 No Content
    if (response.status === 204) return undefined as unknown as T

    const json = await response.json()

    // Zod validation
    if (options.schema) {
      const result = options.schema.safeParse(json)
      if (!result.success) {
        console.error('[api] Response validation failed:', result.error.issues)
        // In development, still return the data with a warning.
        // In production you might want to throw.
        if (process.env.NODE_ENV === 'development') {
          console.warn('[api] Returning unvalidated response data.')
        }
      }
      return (result.success ? result.data : json) as T
    }

    return json as T
  }

  return {
    get<T>(path: string, opts?: RequestOptions<T>) {
      return request<T>('GET', path, opts)
    },
    post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions<T>, 'body'>) {
      return request<T>('POST', path, { ...opts, body })
    },
    put<T>(path: string, body?: unknown, opts?: Omit<RequestOptions<T>, 'body'>) {
      return request<T>('PUT', path, { ...opts, body })
    },
    patch<T>(path: string, body?: unknown, opts?: Omit<RequestOptions<T>, 'body'>) {
      return request<T>('PATCH', path, { ...opts, body })
    },
    delete<T>(path: string, opts?: RequestOptions<T>) {
      return request<T>('DELETE', path, opts)
    },
  }
}

export type HttpClient = ReturnType<typeof createHttpClient>

