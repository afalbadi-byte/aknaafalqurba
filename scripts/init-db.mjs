// Runs lib/schema.sql against the Postgres URL in DATABASE_URL.
//   node scripts/init-db.mjs
//
// Reads DATABASE_URL from process.env (so dotenv/.env.local is honored if you
// have one) and falls back to asking for it via prompt.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import postgres from 'postgres'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Best-effort load of .env.local (so DATABASE_URL=… in that file is picked up)
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/i)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

let url = process.env.DATABASE_URL || process.env.POSTGRES_URL || ''
if (!url) {
  const rl = readline.createInterface({ input, output })
  url = (await rl.question('الصق DATABASE_URL هنا: ')).trim()
  rl.close()
}
if (!url) {
  console.error('لا يوجد DATABASE_URL')
  process.exit(1)
}

const client = postgres(url, { ssl: 'require', max: 1, idle_timeout: 5 })

async function apply(sqlText, label) {
  try {
    await client.unsafe(sqlText)
    console.log(`✅ ${label} applied`)
  } catch (e) {
    // Re-runnable migrations: ignore "already exists" errors
    if (/already exists|duplicate/i.test(e.message)) {
      console.log(`↪︎ ${label} already applied (skipped)`)
    } else {
      throw e
    }
  }
}

try {
  console.log('Connecting…')

  // Base schema (only runs cleanly on a fresh DB; harmless idempotent for migrations)
  const schemaPath = path.join(__dirname, '..', 'lib', 'schema.sql')
  if (fs.existsSync(schemaPath)) {
    const baseExists = await client`SELECT to_regclass('public.members') AS t`
    if (!baseExists[0].t) {
      await apply(fs.readFileSync(schemaPath, 'utf8'), 'schema.sql')
    } else {
      console.log('↪︎ base schema already exists, skipping schema.sql')
    }
  }

  // Sequential migrations from lib/migrations/*.sql
  const migDir = path.join(__dirname, '..', 'lib', 'migrations')
  if (fs.existsSync(migDir)) {
    const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort()
    for (const f of files) {
      await apply(fs.readFileSync(path.join(migDir, f), 'utf8'), `migration ${f}`)
    }
  }

  console.log('🎉 All done')
} catch (e) {
  console.error('❌ Failed:', e.message)
  process.exit(1)
} finally {
  await client.end({ timeout: 5 })
}
