import postgres from 'postgres'

// Lazy singleton — only created on first SQL call, not at import time.
// This lets `next build` succeed even when DATABASE_URL is unset
// (e.g. on a developer machine, or during Vercel's build phase).
declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined
}

function makeClient() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return postgres(url, {
    ssl: url.includes('localhost') ? false : 'require',
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    transform: { undefined: null },
  })
}

function getClient() {
  if (!globalThis.__sql) globalThis.__sql = makeClient()
  return globalThis.__sql
}

// Proxy that defers connection until any property/method is touched.
// Behaves identically to a real postgres-js client at runtime.
export const sql: ReturnType<typeof postgres> = new Proxy(function () {} as any, {
  get(_, prop) {
    const client = getClient() as any
    const v = client[prop]
    return typeof v === 'function' ? v.bind(client) : v
  },
  apply(_t, _this, args) {
    // Tagged template usage: sql`...`
    return (getClient() as any)(...args)
  },
})
