/**
 * AI document verification using Anthropic Claude.
 * Extracts name + national ID from a Tawakkalna PDF or image,
 * then checks if the person belongs to البادي family.
 *
 * Requires env var:  ANTHROPIC_API_KEY
 */

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
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.warn('[ai-verify] ANTHROPIC_API_KEY not set — skipping AI verification')
    return null
  }

  const { full_name, national_id, id_document } = opts

  // Determine media type
  const mediaTypeMatch = id_document.match(/^data:([^;]+);base64,/)
  if (!mediaTypeMatch) return { verified: false, is_badi: false, id_matches: false, extracted_name: null, extracted_id: null, error: 'unsupported_format' }

  const mediaType = mediaTypeMatch[1]
  const base64    = id_document.split(',')[1]
  const isImage   = mediaType.startsWith('image/')
  const isPdf     = mediaType === 'application/pdf'

  if (!isImage && !isPdf) {
    return { verified: false, is_badi: false, id_matches: false, extracted_name: null, extracted_id: null, error: 'unsupported_format' }
  }

  // Build content block
  const docBlock = isImage
    ? { type: 'image',    source: { type: 'base64', media_type: mediaType, data: base64 } }
    : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }

  const headers: Record<string, string> = {
    'Content-Type':    'application/json',
    'x-api-key':       apiKey,
    'anthropic-version': '2023-06-01',
  }
  if (isPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25'

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
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
              text: `أنت نظام للتحقق من وثائق الهوية الرسمية السعودية.
استخرج من هذه الوثيقة:
1. الاسم الكامل (كما يظهر في الوثيقة)
2. رقم الهوية الوطنية (10 أرقام)

أجب بـ JSON فقط، لا تضف أي نص خارجه:
{"name": "الاسم الكامل هنا", "national_id": "1234567890"}

إذا لم تتمكن من قراءة أي حقل استخدم null.`,
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[ai-verify] Anthropic error:', res.status, err)
      return null
    }

    const data = await res.json() as any
    const text = data?.content?.[0]?.type === 'text' ? (data.content[0].text as string) : ''

    // Parse JSON from response (strip any surrounding text)
    let parsed: { name?: string | null; national_id?: string | null } = {}
    const jsonMatch = text.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]) } catch { /* ignore */ }
    }

    const extractedName = typeof parsed.name === 'string' ? parsed.name.trim() : null
    const extractedId   = typeof parsed.national_id === 'string'
      ? parsed.national_id.replace(/[\s\-_]/g, '')
      : null

    const memberIdClean = (national_id || '').replace(/[\s\-_]/g, '')

    const isBadi    = full_name.includes('البادي') || (extractedName || '').includes('البادي')
    const idMatches = !!(extractedId && memberIdClean && extractedId === memberIdClean)

    return {
      verified:       isBadi && idMatches,
      is_badi:        isBadi,
      id_matches:     idMatches,
      extracted_name: extractedName,
      extracted_id:   extractedId,
    }
  } catch (e: any) {
    console.error('[ai-verify] fetch exception:', e.message)
    return null
  }
}
