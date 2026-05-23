import { sql } from '@/lib/db'
import { currentUser, jsonOK, jsonError } from '@/lib/auth'

export async function GET() {
  const user = await currentUser()
  if (!user) return jsonError('unauthenticated', 'يرجى تسجيل الدخول', 401)

  // Fetch gender + generation_number separately (may not exist before migration 010)
  let gender: string | null = null
  let generation_number: number | null = null
  let signature: string | null = null
  try {
    const [extra] = await sql<{ gender: string | null; generation_number: number | null }[]>`
      SELECT gender, generation_number FROM members WHERE id = ${user.id}
    `
    gender = extra?.gender ?? null
    generation_number = extra?.generation_number ?? null
  } catch { /* migration 010 not yet applied */ }
  try {
    const [sig] = await sql<{ signature: string | null }[]>`
      SELECT signature FROM members WHERE id = ${user.id}
    `
    signature = sig?.signature ?? null
  } catch { /* migration 021 not yet applied */ }

  return jsonOK({ user: { ...user, gender, generation_number, signature } })
}
