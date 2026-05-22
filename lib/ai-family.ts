/**
 * AI extraction of family members from a Saudi Tawakkalna family register (سجل الأسرة).
 * Returns an array of extracted family members for user review before saving.
 *
 * Requires env var: ANTHROPIC_API_KEY
 */

export interface ExtractedMember {
  full_name:   string
  relation:    'spouse' | 'son' | 'daughter' | 'father' | 'mother' | 'other'
  birth_date:  string | null   // ISO YYYY-MM-DD (Gregorian)
  national_id: string | null
}

const VALID_RELATIONS = ['spouse', 'son', 'daughter', 'father', 'mother', 'other'] as const

/** Validate ISO date string YYYY-MM-DD */
function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s)
  return !isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100
}

export async function extractFamilyRegister(
  document: string, // base64 data URL (PDF or image)
): Promise<ExtractedMember[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[ai-family] ANTHROPIC_API_KEY not set — skipping AI extraction')
    return null
  }

  const mediaTypeMatch = document.match(/^data:([^;]+);base64,/)
  if (!mediaTypeMatch) return null

  const mediaType = mediaTypeMatch[1]
  const base64    = document.split(',')[1]
  const isImage   = mediaType.startsWith('image/')
  const isPdf     = mediaType === 'application/pdf'

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
      method:  'POST',
      headers,
      body: JSON.stringify({
        model:      'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            docBlock,
            {
              type: 'text',
              text: `أنت نظام لاستخراج بيانات أفراد الأسرة من سجل الأسرة السعودي الرسمي (من تطبيق توكلنا أو أبشر).

استخرج جميع أفراد الأسرة من هذا المستند (لا تُدرج صاحب السجل نفسه).

لكل فرد استخرج:
- full_name: الاسم الكامل كما يظهر في الوثيقة
- relation: صلة القرابة — إحدى القيم التالية بالضبط:
  "spouse"   ← زوج / زوجة
  "son"      ← ابن
  "daughter" ← ابنة
  "father"   ← أب
  "mother"   ← أم
  "other"    ← أي صلة أخرى (أخ، أخت، جد، جدة...)
- birth_date: تاريخ الميلاد الكامل بصيغة YYYY-MM-DD ميلادية.
  ملاحظة: تطبيق توكلنا قد يعرض التاريخ بالهجري — قم بتحويله للميلادي.
  مثال: إذا ظهر "15/03/1415 هـ" فالناتج "1994-08-21".
  إذا ظهر اليوم والشهر فقط دون وضوح، اجعل اليوم والشهر 01.
  إذا لم يظهر التاريخ على الإطلاق، أرجع null.
- national_id: رقم الهوية الوطنية (10 أرقام بلا مسافات)، أو null إذا لم يظهر

أجب بـ JSON array فقط بلا أي نص إضافي:
[
  {"full_name": "الاسم هنا", "relation": "son", "birth_date": "2005-03-14", "national_id": null},
  {"full_name": "اسم آخر",  "relation": "spouse", "birth_date": "1985-07-01", "national_id": "1234567890"}
]

إذا لم تجد أفراد أسرة في المستند، أجب بـ []`,
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      console.error('[ai-family] Anthropic error:', res.status, await res.text())
      return null
    }

    const data = await res.json() as any
    const text = data?.content?.[0]?.type === 'text' ? (data.content[0].text as string) : ''

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    let parsed: any[] = []
    try { parsed = JSON.parse(jsonMatch[0]) } catch { return [] }
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(m => m && typeof m.full_name === 'string' && m.full_name.trim())
      .map(m => ({
        full_name:   m.full_name.trim(),
        relation:    (VALID_RELATIONS as readonly string[]).includes(m.relation)
                       ? m.relation as ExtractedMember['relation']
                       : 'other',
        birth_date:  typeof m.birth_date === 'string' && isValidIsoDate(m.birth_date)
                       ? m.birth_date
                       : null,
        national_id: typeof m.national_id === 'string'
                       ? m.national_id.replace(/\D/g, '') || null
                       : null,
      }))
  } catch (e: any) {
    console.error('[ai-family] fetch exception:', e.message)
    return null
  }
}
