'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api-client'
import { NEWS_CATEGORIES, formatDate } from '@/lib/utils'
import { Pin } from 'lucide-react'

export default function NewsList() {
  const [items, setItems] = useState<any[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { load() }, [filter])
  async function load() {
    setLoading(true)
    try { const r = await api.news.list(filter || undefined); setItems(r.news) }
    finally { setLoading(false) }
  }
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-brand-950">أخبار العائلة</h1>
        <p className="text-brand-600 text-sm">آخر الإعلانات والمناسبات</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip label="الكل" active={!filter} on={() => setFilter('')} />
        {Object.entries(NEWS_CATEGORIES).map(([k, v]) => (
          <Chip key={k} label={v} active={filter === k} on={() => setFilter(k)} />
        ))}
      </div>
      {loading && <div className="text-center text-brand-500 py-8">جاري التحميل...</div>}
      {!loading && items.length === 0 && (
        <div className="card card-body text-center text-brand-500 py-12">لا توجد أخبار في هذه الفئة</div>
      )}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map(n => (
          <Link key={n.id} href={`/news/${n.id}`} className="card hover:shadow-lg transition group">
            {n.cover_image
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={n.cover_image} alt={n.title} className="w-full h-44 object-cover" />
              : <div className="w-full h-44 bg-gradient-to-br from-brand-100 to-brand-200" />
            }
            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-info">{NEWS_CATEGORIES[n.category]}</span>
                {n.is_pinned && <span className="badge badge-gold"><Pin size={12} /> مثبّت</span>}
              </div>
              <h3 className="font-bold text-brand-950 mb-2 line-clamp-2 group-hover:text-brand-700">{n.title}</h3>
              {n.summary && <p className="text-sm text-brand-600 line-clamp-2">{n.summary}</p>}
              <div className="text-xs text-brand-400 mt-3">{formatDate(n.published_at)} · {n.author_name}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
function Chip({ label, active, on }: any) {
  return (
    <button onClick={on}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition border ${
        active ? 'bg-brand-950 text-white border-brand-950' : 'bg-white text-brand-700 border-brand-200 hover:bg-brand-50'
      }`}>{label}</button>
  )
}
