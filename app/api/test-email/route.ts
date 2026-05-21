/**
 * GET /api/test-email?to=you@example.com
 * Sends a test email and returns the SMTP config status.
 * Admin-only. Delete this file after confirming email works.
 */
import { NextRequest } from 'next/server'
import { currentUser, jsonOK, jsonError } from '@/lib/auth'
import nodemailer from 'nodemailer'

export async function GET(req: NextRequest) {
  const user = await currentUser()
  if (!user || !['admin', 'president'].includes(user.role))
    return jsonError('forbidden', 'صلاحيات المدير مطلوبة', 403)

  const to = req.nextUrl.searchParams.get('to') || user.email
  if (!to) return jsonError('no_to', 'حدد الإيميل المستلم', 400)

  const cfg = {
    SMTP_HOST:   process.env.SMTP_HOST   || '❌ غير مضبوط',
    SMTP_PORT:   process.env.SMTP_PORT   || '❌ غير مضبوط',
    SMTP_SECURE: process.env.SMTP_SECURE || '❌ غير مضبوط',
    SMTP_USER:   process.env.SMTP_USER   || '❌ غير مضبوط',
    SMTP_PASS:   process.env.SMTP_PASS   ? '✅ مضبوط (مخفي)' : '❌ غير مضبوط',
    SMTP_FROM:   process.env.SMTP_FROM   || '❌ غير مضبوط',
  }

  if (!process.env.SMTP_HOST) {
    return jsonOK({ sent: false, reason: 'SMTP_HOST غير مضبوط', config: cfg })
  }

  try {
    const t = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Verify connection first
    await t.verify()

    const FROM = process.env.SMTP_FROM || `Akhnaf <${process.env.SMTP_USER}>`
    await t.sendMail({
      from: FROM,
      to,
      subject: 'اختبار إعداد الإيميل - صندوق أكناف القربى',
      text: 'إذا وصلتك هذه الرسالة فإعداد SMTP يعمل بشكل صحيح ✅',
      html: `<div dir="rtl" style="font-family:Arial;padding:20px">
        <h2>✅ إعداد الإيميل يعمل!</h2>
        <p>إذا وصلتك هذه الرسالة فإعداد SMTP لصندوق أكناف القربى يعمل بشكل صحيح.</p>
      </div>`,
    })

    return jsonOK({ sent: true, to, config: cfg })
  } catch (e: any) {
    return jsonOK({ sent: false, error: e.message, config: cfg })
  }
}
