/**
 * AI document verification using Anthropic Claude.
 * Extracts name + national ID from a Tawakkalna PDF or image,
 * then checks if the person belongs to البادي family.
 *
 * Requires env var:  ANTHROPIC_API_KEY
 */

/* ────────────────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────────────────── */
async function callClaude(docBlock: object, promptText: string, isPdf: boolean): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

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
        max_tokens: 500,
        messages: [{ role: 'user', content: [docBlock, { type: 'text', text: promptText }] }],
      }),
    })
    if (!res.ok) { console.error('[ai-verify] HTTP', res.status, await res.text()); return null }
    const data = await res.json() as any
    return data?.content?.[0]?.type === 'text' ? (data.content[0].text as string) : null
  } catch (e: any) {
    console.error('[ai-verify] fetch error:', e.message)
    return null
  }
}

function buildDocBlock(id_document: string): { block: object; isPdf: boolean } | null {
  const m = id_document.match(/^data:([^;]+);base64,/)
  if (!m) return null
  const mediaType = m[1]
  const base64    = id_document.split(',')[1]
  const isImage   = mediaType.startsWith('image/')
  const isPdf     = mediaType === 'application/pdf'
  if (!isImage && !isPdf) return null
  const block = isImage
    ? { type: 'image',    source: { type: 'base64', media_type: mediaType, data: base64 } }
    : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
  return { block, isPdf }
}

/* ────────────────────────────────────────────────────────────
   extractIdDocument — called before registration to auto-fill form
──────────────────────────────────────────────────────────── */
export interface ExtractedId {
  full_name:   string | null
  national_id: string | null
  birth_date:  string | null   // ISO YYYY-MM-DD (Gregorian)
  gender:      'male' | 'female' | null
}

export async function extractIdDocument(id_document: string): Promise<ExtractedId | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[ai-verify] ANTHROPIC_API_KEY not set — skipping extraction')
    return null
  }

  const doc = buildDocBlock(id_document)
  if (!doc) return null

  const text = await callClaude(
    doc.block,
    `أنت نظام لقراءة وثائق الهوية الرسمية السعودية من تطبيق توكلنا.
استخرج من هذه الوثيقة البيانات التالية بدقة:
1. الاسم الكامل بالعربي (كما يظهر في الوثيقة — الاسم الرباعي أو الثلاثي)
2. رقم الهوية الوطنية (10 أرقام تبدأ بـ 1)
3. تاريخ الميلاد الميلادي (بصيغة YYYY-MM-DD) — إذا ظهر التاريخ هجرياً فحوّله إلى ميلادي
4. الجنس: "male" للذكر، "female" للأنثى

أجب بـ JSON فقط بدون أي نص إضافي:
{"full_name": "الاسم هنا", "national_id": "1234567890", "birth_date": "1985-04-05", "gender": "male"}

ملاحظات التحويل الهجري-الميلادي: 1405هـ ≈ 1985م — اعتمد على الخوارزمية التبليرية. استخدم null لأي حقل لم تتمكن من قراءته بوضوح.`,
    doc.isPdf,
  )

  if (!text) return null

  let parsed: any = {}
  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (jsonMatch) { try { parsed = JSON.parse(jsonMatch[0]) } catch { /* ignore */ } }

  const nid = typeof parsed.national_id === 'string' ? parsed.national_id.replace(/\D/g, '').slice(0, 10) : null

  return {
    full_name:   typeof parsed.full_name  === 'string' ? parsed.full_name.trim()  : null,
    national_id: nid && nid.length >= 10  ? nid        : null,
    birth_date:  typeof parsed.birth_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.birth_date)
      ? parsed.birth_date : null,
    gender:      parsed.gender === 'male' || parsed.gender === 'female' ? parsed.gender : null,
  }
}

/* ────────────────────────────────────────────────────────────
   verifyIdDocument — called at registration / verify-identity
──────────────────────────────────────────────────────────── */
export interface VerifyResult {
  verified:       boolean   // passed all checks
  is_badi:        boolean   // name contains البادي
  id_matches:     boolean   // extracted ID matches record
  extracted_name: string | null
  extracted_id:   string | null
  error?:         string
}

export async function verifyIdDocument(opts: {
  full_name:   string
  national_id: string | null
  id_document: string   // base64 data URL
}): Promise<VerifyResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[ai-verify] ANTHROPIC_API_KEY not set — skipping AI verification')
    return null
  }

  const { full_name, national_id, id_document } = opts

  const doc = buildDocBlock(id_document)
  if (!doc) return { verified: false, is_badi: false, id_matches: false, extracted_name: null, extracted_id: null, error: 'unsupported_format' }

  const text = await callClaude(
    doc.block,
    `أنت نظام للتحقق من وثائق الهوية الرسمية السعودية.
استخرج من هذه الوثيقة:
1. الاسم الكامل (كما يظهر في الوثيقة)
2. رقم الهوية الوطنية (10 أرقام)

أجب بـ JSON فقط، لا تضف أي نص خارجه:
{"name": "الاسم الكامل هنا", "national_id": "1234567890"}

إذا لم تتمكن من قراءة أي حقل استخدم null.`,
    doc.isPdf,
  )

  if (!text) return null

  let parsed: { name?: string | null; national_id?: string | null } = {}
  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (jsonMatch) { try { parsed = JSON.parse(jsonMatch[0]) } catch { /* ignore */ } }

  const extractedName = typeof parsed.name === 'string' ? parsed.name.trim() : null
  const extractedId   = typeof parsed.national_id === 'string'
    ? parsed.national_id.replace(/[\s\-_]/g, '') : null

  const memberIdClean = (national_id || '').replace(/[\s\-_]/g, '')
  const isBadi        = full_name.includes('البادي') || (extractedName || '').includes('البادي')
  const idMatches     = !!(extractedId && memberIdClean && extractedId === memberIdClean)

  return {
    verified:       isBadi && idMatches,
    is_badi:        isBadi,
    id_matches:     idMatches,
    extracted_name: extractedName,
    extracted_id:   extractedId,
  }
}
