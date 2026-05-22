import { NextRequest } from 'next/server'
import { sql } from '@/lib/db'
import { requireRole, COMMITTEE_ROLES, TREASURY_ROLES, jsonOK, jsonError } from '@/lib/auth'
import { saveUpload } from '@/lib/storage'
import { log, getIP } from '@/lib/log'

export async function GET() {
  const { error } = await requireRole(COMMITTEE_ROLES)
  if (error) return error
  const rows = await sql`
    SELECT e.*, m.full_name AS creator_name
    FROM expenses e LEFT JOIN members m ON m.id = e.created_by
    ORDER BY e.expense_date DESC, e.id DESC LIMIT 500
  `
  return jsonOK({ expenses: rows })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(TREASURY_ROLES)
  if (error) return error

  const fd = await req.formData()
  if (!fd.get('title') || !fd.get('amount') || !fd.get('expense_date'))
    return jsonError('missing_field', 'بيانات ناقصة', 400)

  let attachment: string | null = null
  try { attachment = await saveUpload(fd.get('attachment') as File | null, 'expenses') }
  catch (e: any) { return jsonError('upload_error', e.message, 400) }

  const [ins] = await sql<{ id: number }[]>`
    INSERT INTO expenses (title, category, amount, expense_date, recipient, description, attachment, related_aid_id, created_by)
    VALUES (
      ${String(fd.get('title')).trim()},
      ${(fd.get('category')  as string) || null},
      ${Number(fd.get('amount'))},
      ${String(fd.get('expense_date'))},
      ${(fd.get('recipient') as string) || null},
      ${(fd.get('description') as string) || null},
      ${attachment},
      ${fd.get('related_aid_id') ? Number(fd.get('related_aid_id')) : null},
      ${user.id}
    )
    RETURNING id
  `
  void log(user.id, 'expense.create', { ip: getIP(req), member_name: user.full_name, entity: 'expense', entity_id: ins.id, details: { title: String(fd.get('title')).trim(), amount: Number(fd.get('amount')) } })
  return jsonOK({ id: ins.id })
}
