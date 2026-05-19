'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import { NEWS_CATEGORIES, formatDate } from '@/lib/utils'
import { ArrowRight, Pin } from 'lucide-react'

export default function NewsArticle() {
  const { id } = useParams<{ id: string }>()
  const [item, setItem] = useState<any>(null)
  useEffect(() => { api.news.get(Number(id)).then(r => setItem(r.news)) }, [id])
  if (!item) return <div className="text-center text-brand-500 py-8">جاري التحميل...</div>

  return (
    <article className="max-w-3xl mx-auto space-y-6">
      <Link href="/news" className="text-sm text-brand-600 hover:text-brand-950 flex items-center gap-1">
        <ArrowRight size={14} /> العودة للأخبار
      </Link>
      <div className="card overflow-hidden">
        {item.cover_image && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.cover_image} alt={item.title} className="w-full h-64 sm:h-80 object-cover" />
        )}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge badge-info">{NEWS_CATEGORIES[item.category]}</span>
            {item.is_pinned && <span className="badge badge-gold"><Pin size={12} /> مثبّت</span>}
          </div>
          <h1 className="font-display text-3xl font-extrabold text-brand-950 mb-3">{item.title}</h1>
          <div className="text-sm text-brand-500 mb-6 border-b border-brand-100 pb-4">
            بقلم <strong className="text-brand-700">{item.author_name}</strong> · {formatDate(item.published_at, true)}
          </div>
          {item.summary && (
            <p className="text-lg text-brand-700 leading-relaxed font-medium mb-6 border-r-4 border-gold-300 pr-4">
              {item.summary}
            </p>
          )}
          <div className="text-brand-800 leading-loose whitespace-pre-wrap">{item.body}</div>
        </div>
      </div>
    </article>
  )
}
