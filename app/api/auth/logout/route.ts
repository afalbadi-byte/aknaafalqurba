import { NextRequest } from 'next/server'
import { destroySession, currentUser, jsonOK } from '@/lib/auth'
import { log, getIP } from '@/lib/log'

export async function POST(req: NextRequest) {
  const user = await currentUser()
  void log(user?.id ?? null, 'auth.logout', { ip: getIP(req), member_name: user?.full_name ?? null })
  await destroySession()
  return jsonOK()
}
