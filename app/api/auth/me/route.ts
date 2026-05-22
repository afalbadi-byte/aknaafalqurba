import { sql } from '@/lib/db'
import { currentUser, jsonOK, jsonError } from '@/lib/auth'

export async function GET() {
  const user = await currentUser()
  if (!user) return jsonError('unauthenticated', 'يرجى تسجيل الدخول', 401)

  // Fetch extra columns added by later migrations
  let gender: string | null = null
  let generation_number: number | null = null
  let phone_verified = false
  try {
    const [extra] = await sql<{ gender: string | null; generation_number: number | null; phone_verified: boolean }[]>`
      SELECT gender, generation_number, phone_verified FROM members WHERE id = ${user.id}
    `
    gender = extra?.gender ?? null
    generation_number = extra?.generation_number ?? null
    phone_verified = extra?.phone_verified ?? false
  } catch { /* migration not yet applied */ }

  return jsonOK({ user: { ...user, gender, generation_number, phone_verified } })
}
