import { currentUser, jsonOK, jsonError } from '@/lib/auth'

export async function GET() {
  const user = await currentUser()
  if (!user) return jsonError('unauthenticated', 'يرجى تسجيل الدخول', 401)
  return jsonOK({ user })
}
