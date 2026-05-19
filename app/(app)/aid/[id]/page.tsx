'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api-client'
import {
  formatDate, formatMoney, statusBadge, STATUS_LABELS, AID_TYPES, ROLE_LABELS,
} from '@/lib/utils'
import { ArrowRight, Send, Paperclip, Printer } from 'lucide-react'

const COMMITTEE = ['admin','president','treasurer','aid_committee']

export default function AidDetail() {
  const { id } = useParams<{ id: string }>()
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<any>(null)
  const [updates, setUpdates] = useState<any[]>([])
  const [text, setText] = useState('')
  const [internal, setInternal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [statusForm, setStatusForm] = useState({ status: '', approved_amount: '', committee_notes: '' })

  useEffect(() => {
    api.auth.me().then(r => setUser(r.user))
    load()
  }, [id])

  async function load() {
    const r = await api.aid.get(Number(id))
    setData(r.request); setUpdates(r.updates)
    setStatusForm({
      status: r.request.status,
      approved_amount: r.request.approved_amount || '',
      committee_notes: r.request.committee_notes || '',
    })
  }

  async function postUpdate(e: React.FormEvent) {
    e.preventDefault(); if (!text.trim()) return
    setBusy(true)
    try {
      await api.aid.addUpdate(Number(id), { body: text, is_internal: internal })
      setText(''); setInternal(false)
      await load()
    } finally { setBusy(false) }
  }

  async function saveStatus(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    try {
      await api.aid.updateStatus(Number(id), statusForm)
      await load()
    } finally { setBusy(false) }
  }

  if (!data || !user) return <div className="text-center text-brand-500 py-8">جاري التحميل...</div>
  const isCommittee = COMMITTEE.includes(user.role)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href="/aid" className="text-sm text-brand-600 hover:text-brand-950 flex items-center gap-1">
          <ArrowRight size={14} /> العودة
        </Link>
        <button onClick={() => window.print()} className="btn-ghost no-print"><Printer size={16} /> طباعة</button>
      </div>

      <div className="card print-letterhead">
        <div className="p-6 border-b border-brand-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-info">{AID_TYPES[data.aid_type]}</span>
            <span className={statusBadge(data.status)}>{STATUS_LABELS[data.status]}</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-brand-950">{data.title}</h1>
          <div className="text-sm text-brand-500 mt-2">رقم الطلب #{data.id} · {formatDate(data.created_at, true)}</div>
        </div>

        <div className="p-6 grid sm:grid-cols-3 gap-4 text-sm border-b border-brand-100">
          <KV k="مقدّم الطلب" v={data.member_name} />
          <KV k="الفرع" v={data.member_branch || '—'} />
          <KV k="الجوال" v={data.member_phone} mono />
          {data.requested_amount && <KV k="المبلغ المطلوب" v={formatMoney(data.requested_amount)} />}
          {data.dependents_count != null && <KV k="عدد المعالين" v={data.dependents_count} />}
          {data.monthly_income && <KV k="الدخل الشهري" v={formatMoney(data.monthly_income)} />}
          {data.approved_amount && <KV k="المبلغ المعتمد" v={formatMoney(data.approved_amount)} className="text-emerald-700" />}
        </div>

        <div className="p-6 border-b border-brand-100">
          <h3 className="font-bold text-brand-950 mb-2">التفاصيل</h3>
          <p className="text-brand-700 leading-relaxed whitespace-pre-wrap">{data.description}</p>

          {data.attachment && (
            <a href={data.attachment} target="_blank" rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-brand-600 hover:text-brand-950 font-semibold text-sm">
              <Paperclip size={16} /> عرض المرفق
            </a>
          )}

          {data.committee_notes && (
            <div className="mt-4 bg-brand-50/60 border-r-4 border-brand-500 px-4 py-3 rounded">
              <div className="text-xs font-bold text-brand-600 mb-1">ملاحظات اللجنة</div>
              <div className="text-sm text-brand-800 whitespace-pre-wrap">{data.committee_notes}</div>
            </div>
          )}
        </div>

        {isCommittee && (
          <div className="p-6 bg-gold-50/40 no-print">
            <h3 className="font-bold text-brand-950 mb-3">قرار اللجنة</h3>
            <form onSubmit={saveStatus} className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label">الحالة</label>
                <select className="input" value={statusForm.status}
                  onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}>
                  <option value="submitted">مُقدّم</option>
                  <option value="under_review">قيد المراجعة</option>
                  <option value="approved">معتمد</option>
                  <option value="rejected">مرفوض</option>
                  <option value="disbursed">تم الصرف</option>
                </select>
              </div>
              <div>
                <label className="label">المبلغ المعتمد</label>
                <input className="input" type="number" step="0.01"
                  value={statusForm.approved_amount}
                  onChange={e => setStatusForm({ ...statusForm, approved_amount: e.target.value })} />
              </div>
              <div className="flex items-end">
                <button className="btn-primary w-full" type="submit" disabled={busy}>حفظ القرار</button>
              </div>
              <div className="sm:col-span-3">
                <label className="label">ملاحظات اللجنة</label>
                <textarea className="input" rows={3}
                  value={statusForm.committee_notes}
                  onChange={e => setStatusForm({ ...statusForm, committee_notes: e.target.value })} />
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="card no-print">
        <div className="px-6 py-4 border-b border-brand-100"><h3 className="font-bold text-brand-950">المحادثة والتحديثات</h3></div>
        <div className="p-6 space-y-3">
          {updates.length === 0 && <div className="text-sm text-brand-500 text-center py-4">لا توجد تحديثات بعد</div>}
          {updates.map(u => {
            const mine = u.author_id === user.id
            return (
              <div key={u.id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${u.is_internal ? 'bg-gold-500' : (mine ? 'bg-brand-950' : 'bg-brand-400')}`}>
                  {u.author_name[0]}
                </div>
                <div className={`flex-1 min-w-0 ${mine ? 'text-end' : ''}`}>
                  <div className="text-xs text-brand-500 mb-1">
                    <span className="font-semibold text-brand-700">{u.author_name}</span>
                    <span className="mx-1">·</span>{ROLE_LABELS[u.author_role]}
                    <span className="mx-1">·</span>{formatDate(u.created_at, true)}
                    {u.is_internal && <span className="badge badge-gold text-[10px] mr-2">داخلي</span>}
                  </div>
                  <div className={`inline-block max-w-full px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${u.is_internal ? 'bg-gold-50 border border-gold-200' : (mine ? 'bg-brand-950 text-white' : 'bg-brand-50 text-brand-900')}`}>
                    {u.body}
                  </div>
                </div>
              </div>
            )
          })}

          <form onSubmit={postUpdate} className="border-t border-brand-100 pt-4 mt-4">
            <textarea className="input" rows={3} placeholder="اكتب رسالتك..."
              value={text} onChange={e => setText(e.target.value)} required />
            <div className="flex items-center justify-between mt-2">
              {isCommittee ? (
                <label className="flex items-center gap-2 text-sm text-brand-700">
                  <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} />
                  ملاحظة داخلية (لا تظهر للعضو)
                </label>
              ) : <span />}
              <button className="btn-primary" type="submit" disabled={busy}>
                <Send size={16} /> إرسال
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function KV({ k, v, className = '', mono }: any) {
  return (
    <div>
      <div className="text-xs text-brand-500 font-semibold">{k}</div>
      <div className={`font-bold text-brand-950 ${mono ? 'font-mono' : ''} ${className}`}>{v}</div>
    </div>
  )
}
