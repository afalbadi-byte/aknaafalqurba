'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { ROLE_LABELS, RELATION_LABELS } from '@/lib/utils'
import { Save, Lock, UserPlus, Trash2, Loader2, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState<any>(null)
  const [deps, setDeps] = useState<any[]>([])
  const [newDep, setNewDep] = useState({ full_name: '', relation: 'son', birth_year: '' })
  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' })
  const [pwdMsg, setPwdMsg] = useState<any>(null)

  useEffect(() => {
    api.auth.me().then(r => { setUser(r.user); setForm(r.user) })
    loadDeps()
  }, [])
  async function loadDeps() {
    try { const r = await api.members.dependents(); setDeps(r.dependents) } catch {}
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      // NOTE: email is intentionally omitted — it has its own verified flow
      await api.members.update({
        full_name: form.full_name, phone: form.phone,
        branch: form.branch, city: form.city, address: form.address,
        national_id: form.national_id, birth_year: form.birth_year,
      })
      setMsg({ ok: true, text: 'تم حفظ التعديلات' })
    } catch (err: any) { setMsg({ ok: false, text: err.message }) }
    finally { setBusy(false) }
  }

  // ----- Email change flow (sends code → enter code → applied) -----
  const [emailNew,    setEmailNew]    = useState('')
  const [emailStep,   setEmailStep]   = useState<'idle' | 'code'>('idle')
  const [emailCode,   setEmailCode]   = useState('')
  const [emailPending, setEmailPending] = useState('')
  const [emailBusy,   setEmailBusy]   = useState(false)
  const [emailMsg,    setEmailMsg]    = useState<any>(null)

  async function requestEmailChange(e: React.FormEvent) {
    e.preventDefault(); setEmailBusy(true); setEmailMsg(null)
    try {
      const r = await api.members.emailChange(emailNew.trim())
      setEmailPending(r.pending_email || emailNew.trim())
      setEmailStep('code')
      setEmailMsg({ ok: true, text: 'تم إرسال رمز التأكيد للبريد الجديد' })
    } catch (err: any) { setEmailMsg({ ok: false, text: err.message }) }
    finally { setEmailBusy(false) }
  }

  async function confirmEmailChange(e: React.FormEvent) {
    e.preventDefault(); setEmailBusy(true); setEmailMsg(null)
    try {
      const r = await api.members.emailConfirm(emailCode.trim())
      setEmailMsg({ ok: true, text: 'تم تحديث بريدك بنجاح' })
      setUser((u: any) => ({ ...u, email: r.email, email_verified: true }))
      setForm((f: any) => ({ ...f, email: r.email }))
      setEmailStep('idle'); setEmailNew(''); setEmailCode(''); setEmailPending('')
    } catch (err: any) { setEmailMsg({ ok: false, text: err.message }) }
    finally { setEmailBusy(false) }
  }

  async function addDep(e: React.FormEvent) {
    e.preventDefault()
    if (!newDep.full_name) return
    await api.members.addDependent(newDep)
    setNewDep({ full_name: '', relation: 'son', birth_year: '' }); loadDeps()
  }
  async function delDep(id: number) {
    if (!confirm('حذف هذا الفرد؟')) return
    await api.members.delDependent(id); loadDeps()
  }

  async function changePwd(e: React.FormEvent) {
    e.preventDefault(); setPwdMsg(null)
    if (pwd.new !== pwd.confirm) return setPwdMsg({ ok: false, text: 'كلمتا المرور غير متطابقتين' })
    try {
      await api.auth.changePassword(pwd.current, pwd.new)
      setPwd({ current: '', new: '', confirm: '' })
      setPwdMsg({ ok: true, text: 'تم تغيير كلمة المرور' })
    } catch (err: any) { setPwdMsg({ ok: false, text: err.message }) }
  }

  if (!user) return <div className="text-center text-brand-500 py-12">جاري التحميل...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-brand-950">بياناتي</h1>
        <p className="text-brand-600 text-sm">إدارة معلوماتك وأفراد عائلتك</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="px-6 py-4 border-b border-brand-100"><h3 className="font-bold text-brand-950">المعلومات الشخصية</h3></div>
          <form onSubmit={saveInfo} className="p-6 grid sm:grid-cols-2 gap-4">
            <F label="الاسم الكامل"     v={form.full_name}   on={(v: string) => set('full_name', v)} />
            <F label="رقم الجوال"       v={form.phone}        on={(v: string) => set('phone', v)} />
            <div>
              <label className="label">البريد الإلكتروني</label>
              <div className="input bg-brand-50/40 flex items-center justify-between gap-2 cursor-not-allowed">
                <span className="text-brand-700 truncate">{user.email || '— غير مسجل —'}</span>
                {user.email && (
                  user.email_verified
                    ? <span className="badge badge-approved text-[10px] shrink-0"><CheckCircle2 size={10}/> مؤكد</span>
                    : <span className="badge badge-pending text-[10px] shrink-0">غير مؤكد</span>
                )}
              </div>
              <p className="text-[11px] text-brand-500 mt-1">لتغيير البريد، استخدم البطاقة على اليسار</p>
            </div>
            <F label="رقم الهوية"        v={form.national_id ?? ''} on={(v: string) => set('national_id', v)} />
            <F label="الفرع/البطن"       v={form.branch ?? ''} on={(v: string) => set('branch', v)} />
            <F label="المدينة"           v={form.city ?? ''}   on={(v: string) => set('city', v)} />
            <F label="سنة الميلاد"        v={form.birth_year ?? ''} on={(v: string) => set('birth_year', v)} type="number" />
            <F label="العنوان"           v={form.address ?? ''} on={(v: string) => set('address', v)} />

            {msg && (
              <div className={`sm:col-span-2 text-sm rounded-lg px-4 py-2.5 ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {msg.text}
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={busy} className="btn-primary">
                {busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} حفظ التعديلات
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="card card-body">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-brand-700 to-brand-950 text-white flex items-center justify-center text-2xl font-bold mb-3">
                {user.full_name[0]}
              </div>
              <div className="font-bold text-brand-950">{user.full_name}</div>
              <div className="text-sm text-brand-500 mb-3">{ROLE_LABELS[user.role]}</div>
              <span className="badge badge-approved">الحساب مفعّل</span>
            </div>
          </div>

          {/* ---- Email change with verification code ---- */}
          <div className="card">
            <div className="px-5 py-4 border-b border-brand-100">
              <h3 className="font-bold text-brand-950 flex items-center gap-2"><Mail size={18} /> تغيير البريد الإلكتروني</h3>
            </div>
            <div className="p-5 space-y-3">
              {emailStep === 'idle' && (
                <form onSubmit={requestEmailChange} className="space-y-3">
                  <input
                    className="input"
                    type="email"
                    placeholder="البريد الإلكتروني الجديد"
                    value={emailNew}
                    onChange={e => setEmailNew(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-brand-500">
                    سنرسل رمز تأكيد مكوّن من ٦ أرقام إلى البريد الجديد قبل تطبيق التغيير.
                  </p>
                  {emailMsg && (
                    <div className={`text-xs rounded px-3 py-2 ${emailMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{emailMsg.text}</div>
                  )}
                  <button className="btn-primary w-full" type="submit" disabled={emailBusy || !emailNew}>
                    {emailBusy && <Loader2 className="animate-spin" size={14} />}
                    إرسال رمز التأكيد
                  </button>
                </form>
              )}
              {emailStep === 'code' && (
                <form onSubmit={confirmEmailChange} className="space-y-3">
                  <div className="text-xs text-brand-600 bg-brand-50/60 rounded px-3 py-2">
                    <ShieldCheck size={14} className="inline ml-1" />
                    أرسلنا الرمز إلى <strong>{emailPending}</strong>
                  </div>
                  <input
                    className="input text-center text-2xl font-bold tracking-widest font-mono"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={emailCode}
                    onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                  />
                  {emailMsg && (
                    <div className={`text-xs rounded px-3 py-2 ${emailMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{emailMsg.text}</div>
                  )}
                  <div className="flex gap-2">
                    <button className="btn-secondary flex-1" type="button" onClick={() => { setEmailStep('idle'); setEmailMsg(null) }}>
                      إلغاء
                    </button>
                    <button className="btn-primary flex-1" type="submit" disabled={emailBusy || emailCode.length !== 6}>
                      {emailBusy && <Loader2 className="animate-spin" size={14} />}
                      تأكيد
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="card">
            <div className="px-5 py-4 border-b border-brand-100">
              <h3 className="font-bold text-brand-950 flex items-center gap-2"><Lock size={18} /> تغيير كلمة المرور</h3>
            </div>
            <form onSubmit={changePwd} className="p-5 space-y-3">
              <input className="input" type="password" placeholder="كلمة المرور الحالية"
                value={pwd.current} onChange={e => setPwd({ ...pwd, current: e.target.value })} required />
              <input className="input" type="password" placeholder="كلمة المرور الجديدة"
                value={pwd.new} onChange={e => setPwd({ ...pwd, new: e.target.value })} required />
              <input className="input" type="password" placeholder="تأكيد كلمة المرور"
                value={pwd.confirm} onChange={e => setPwd({ ...pwd, confirm: e.target.value })} required />
              {pwdMsg && (
                <div className={`text-xs rounded px-3 py-2 ${pwdMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{pwdMsg.text}</div>
              )}
              <button className="btn-secondary w-full" type="submit">تحديث</button>
            </form>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="px-6 py-4 border-b border-brand-100">
          <h3 className="font-bold text-brand-950">أفراد عائلتي</h3>
          <p className="text-xs text-brand-500 mt-0.5">يساعد ذلك لجنة المعونات على تقدير الحاجة</p>
        </div>
        <div className="p-6">
          {deps.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {deps.map(d => (
                <div key={d.id} className="bg-brand-50/60 border border-brand-100 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-brand-950 text-sm">{d.full_name}</div>
                    <div className="text-xs text-brand-500">{RELATION_LABELS[d.relation]}{d.birth_year ? ` · ${d.birth_year}` : ''}</div>
                  </div>
                  <button onClick={() => delDep(d.id)} className="text-red-500 hover:bg-red-50 rounded p-1"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={addDep} className="grid sm:grid-cols-4 gap-3">
            <input className="input sm:col-span-2" placeholder="الاسم"
              value={newDep.full_name} onChange={e => setNewDep({ ...newDep, full_name: e.target.value })} />
            <select className="input" value={newDep.relation}
              onChange={e => setNewDep({ ...newDep, relation: e.target.value })}>
              {Object.entries(RELATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className="input" type="number" placeholder="سنة الميلاد"
              value={newDep.birth_year} onChange={e => setNewDep({ ...newDep, birth_year: e.target.value })} />
            <button className="btn-primary sm:col-span-4" type="submit">
              <UserPlus size={16} /> إضافة فرد
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function F({ label, v, on, type = 'text' }: any) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} value={v ?? ''} onChange={e => on(e.target.value)} />
    </div>
  )
}
