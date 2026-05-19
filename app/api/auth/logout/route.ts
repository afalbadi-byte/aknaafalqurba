import { destroySession, jsonOK } from '@/lib/auth'

export async function POST() {
  await destroySession()
  return jsonOK()
}
