// Shared formatting + label maps. Safe for client and server.

export function formatMoney(n: number | string | null | undefined, currency = 'ر.س') {
  const v = Number(n || 0)
  return `${v.toLocaleString('ar-SA', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })} ${currency}`
}

export function formatDate(iso: string | Date | null | undefined, withTime = false) {
  if (!iso) return '—'
  try {
    const d = typeof iso === 'string' ? new Date(iso) : iso
    const opts: Intl.DateTimeFormatOptions = withTime
      ? { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'long', day: 'numeric' }
    return d.toLocaleDateString('ar-SA-u-nu-latn', opts)
  } catch {
    return String(iso)
  }
}

export function relativeTime(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60)        return 'منذ لحظات'
  if (diff < 3600)      return `منذ ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400)     return `منذ ${Math.floor(diff / 3600)} ساعة`
  if (diff < 86400 * 7) return `منذ ${Math.floor(diff / 86400)} يوم`
  return formatDate(iso)
}

export const ROLE_LABELS: Record<string, string> = {
  member: 'عضو',
  aid_committee: 'لجنة الدعم',
  treasurer: 'أمين الصندوق',
  president: 'رئيس الصندوق',
  admin: 'مدير النظام',
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'بانتظار المراجعة',
  approved: 'معتمدة',
  rejected: 'مرفوضة',
  active: 'مفعّل',
  suspended: 'موقوف',
  submitted: 'مُقدّم',
  under_review: 'قيد المراجعة',
  disbursed: 'تم الصرف',
}

export const AID_TYPES: Record<string, string> = {
  medical: 'علاجية', marriage: 'زواج', education: 'تعليم', debt: 'سداد دين',
  housing: 'إسكان', death: 'وفاة', urgent: 'عاجلة', other: 'أخرى',
}

export const NEWS_CATEGORIES: Record<string, string> = {
  announcement: 'إعلان', wedding: 'زواج/فرح', condolence: 'تعزية',
  meeting: 'اجتماع', achievement: 'إنجاز', general: 'عام',
}

export const PAYMENT_METHODS: Record<string, string> = {
  bank_transfer: 'تحويل بنكي', stc_pay: 'STC Pay', gateway: 'بوابة دفع', cash: 'نقدي',
}

export const PAYMENT_TYPES: Record<string, string> = {
  subscription: 'اشتراك دوري', donation: 'تبرع', zakat: 'زكاة', other: 'أخرى',
}

export const RELATION_LABELS: Record<string, string> = {
  spouse: 'زوج/زوجة', son: 'ابن', daughter: 'ابنة',
  father: 'أب', mother: 'أم', other: 'آخر',
}

export const BRANCHES = ['المحمد', 'الراشد', 'العبدالله', 'السليمان', 'العلي'] as const

export const GENDER_LABELS: Record<string, string> = {
  male: 'ذكر',
  female: 'أنثى',
}

export function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'badge-pending', submitted: 'badge-pending',
    under_review: 'badge-info', approved: 'badge-approved',
    rejected: 'badge-rejected', disbursed: 'badge-gold',
    active: 'badge-approved', suspended: 'badge-rejected',
  }
  return map[status] || 'badge-info'
}
