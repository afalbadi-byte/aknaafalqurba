/**
 * AI extraction from bank transfer / STC Pay receipts.
 * Uses Claude Vision to pull payment fields from a receipt image or PDF.
 *
 * Requires env var: ANTHROPIC_API_KEY
 */

export interface ExtractedReceipt {
  amount:        number | null
  reference:     string | null
  transfer_date: string | null  // ISO YYYY-MM-DD
  sender_name:   string | null
  bank_name:     string | null
}

export async function extractReceipt(receiptData: string): Promise<ExtractedReceipt | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[ai-receipt] ANTHROPIC_API_KEY not set — skipping extraction')
    return null
  }

  const m = receiptData.match(/^data:([^;]+);base64,/)
  if (!m) return null
  const mediaType = m[1]
  const base64    = receiptData.split(',')[1]

  const isImage = mediaType.startsWith('image/')
  const isPdf   = mediaType === 'application/pdf'
  if (!isImage && !isPdf) return null

  const docBlock = isImage
    ? { type: 'image',    source: { type: 'base64', media_type: mediaType, data: base64 } }
    : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }

  const headers: Record<string, string> = {
    'Content-Type':      'application/json',
    'x-api-key':         apiKey,
    'anthropic-version': '2023-06-01',
  }
  if (isPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25'

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model:      'claude-opus-4-5',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            docBlock,
            {
              type: 'text',
              text: `أنت نظام استخراج بيانات إيصالات التحويل البنكي وSTC Pay.

استخرج من هذا الإيصال المعلومات التالية بدقة:
1. المبلغ المحوّل (رقم عشري فقط بدون رمز العملة)
2. رقم العملية أو رقم المرجع (transaction ID / reference number)
3. تاريخ التحويل (بصيغة YYYY-MM-DD فقط)
4. اسم المحوّل / المُرسِل
5. اسم البنك أو الجهة (مثل: الراجحي، الأهلي، STC Pay، إنماء، سامبا)

أجب بـ JSON فقط بدون أي نص خارجه:
{"amount": 500.00, "reference": "TXN123456789", "transfer_date": "2025-01-15", "sender_name": "محمد أحمد البادي", "bank_name": "بنك الراجحي"}

استخدم null لأي حقل لم تتمكن من قراءته بوضوح.`,
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      console.error('[ai-receipt] HTTP', res.status, await res.text())
      return null
    }

    const data = await res.json() as any
    const text: string | null = data?.content?.[0]?.type === 'text' ? data.content[0].text : null
    if (!text) return null

    let parsed: any = {}
    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]) } catch { /* ignore */ }
    }

    const rawAmount = parsed.amount
    const amount =
      typeof rawAmount === 'number' ? rawAmount
      : typeof rawAmount === 'string' ? parseFloat(rawAmount.replace(/[^\d.]/g, ''))
      : null

    return {
      amount:        amount !== null && !isNaN(amount) ? Math.round(amount * 100) / 100 : null,
      reference:     typeof parsed.reference    === 'string' ? parsed.reference.trim()    : null,
      transfer_date: typeof parsed.transfer_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.transfer_date)
        ? parsed.transfer_date : null,
      sender_name:   typeof parsed.sender_name  === 'string' ? parsed.sender_name.trim()  : null,
      bank_name:     typeof parsed.bank_name    === 'string' ? parsed.bank_name.trim()    : null,
    }
  } catch (e: any) {
    console.error('[ai-receipt] fetch error:', e.message)
    return null
  }
}
