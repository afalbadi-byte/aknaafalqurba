import Link from 'next/link'
import { sql } from '@/lib/db'
import { NEWS_CATEGORIES, formatDate } from '@/lib/utils'
import Logo from '@/components/logo'

async function loadPublicNews() {
  try {
    return await sql`
      SELECT n.id, n.title, n.category, n.summary, n.cover_image, n.published_at,
             m.full_name AS author_name
      FROM news n JOIN members m ON m.id = n.author_id
      WHERE n.is_public = TRUE
      ORDER BY n.is_pinned DESC, n.published_at DESC LIMIT 100
    `
  } catch { return [] }
}

export default async function PublicNews() {
  const items = await loadPublicNews()
  return (
    <div className="min-h-screen with-watermark">
      <header className="bg-white border-b border-brand-100">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/"><Logo /></Link>
          <Link href="/login" className="btn-primary">تسجيل الدخول</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-display text-3xl font-extrabold text-brand-950 mb-2">أخبار العائلة</h1>
        <p className="text-brand-600 mb-8">آخر المستجدات والإعلانات والمناسبات</p>

        {items.length === 0 && (
          <div className="card card-body text-center text-brand-500">لا توجد أخبار منشورة بعد</div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((n: any) => (
            <article key={n.id} className="card hover:shadow-lg transition">
              {n.cover_image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={n.cover_image} alt={n.title} className="w-full h-44 object-cover" />
              )}
              <div className="p-5">
                <span className="badge badge-info mb-2">{NEWS_CATEGORIES[n.category]}</span>
                <h3 className="font-bold text-brand-950 mb-2 line-clamp-2">{n.title}</h3>
                {n.summary && <p className="text-sm text-brand-600 line-clamp-3 mb-3">{n.summary}</p>}
                <div className="text-xs text-brand-400">{formatDate(n.published_at)} · {n.author_name}</div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
