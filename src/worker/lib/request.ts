import type { Context } from 'hono'

/** Parses a JSON object body, rejecting arrays, primitives and malformed input. */
export async function readJsonObject(c: Context): Promise<Record<string, unknown> | null> {
  try {
    const parsed = (await c.req.json()) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}
