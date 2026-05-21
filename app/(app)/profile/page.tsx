'use client'
import { useRef, useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { ROLE_LABELS, RELATION_LABELS } from '@/lib/utils'
import {
  Save, Lock, UserPlus, Trash2, Loader2, Mail, ShieldCheck,
  CheckCircle2, Camera, X as XIcon,
} from 'lucide-react'
import { Avatar } from '@/components/app-shell'

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState<any>(null)
  const [deps, setDeps] = useState<any[]>([])
  const [newDep, setNewDep] = useState({ full_name: '', relation: 'son', birth_year: '' })
  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' })
  const [pwdMsg, setPwdMsg] = useState<any>(null)

  // Avatar
  const fileRef    = useRef<HTMLInputElement>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarMsg,  setAvatarMsg]  = useState<any>(null)

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
      await api.members.update({
        full_name:   form.full_name,
        phone:       form.phone,
        branch:      form.branch,
        city:        form.city,
        address:     form.address,
        national_id: form.national_id,
        birth_date:  form.birth_date || null,
        notes:       form.notes || null,
      })
      setMsg({ ok: true, text: 'تم حفظ التعديلات' })
    } catch (err: any) { setMsg({ ok: false, text: err.message }) }
    finally { setBusy(false) }
  }

  // ----- Avatar -----
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarBusy(true); setAvatarMsg(null)
    try {
      const fd = new FormData(); fd.append('avatar', file)
      const r  = await api.members.avatarUpload(fd)
      setUser((u: any) => ({ ...u, avatar: r.avatar }))
      setAvatarMsg({ ok: true, text: 'تم تحديث صورتك' })
    } catch (err: any) { setAvatarMsg({ ok: false, text: err.message }) }
    finally { setAvatarBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function removeAvatar() {
    if (!confirm('حذف صورتك الشخصية؟')) return
    setAvatarBusy(true); setAvatarMsg(null)
    try {
      await api.members.avatarRemove()
      setUser((u: any) => ({ ...u, avatar: null }))
      setAvatarMsg({ ok: true, text: 'تم حذف الصورة' })
    } catch (err: any) { setAvatarMsg({ ok: false, text: err.message }) }
    finally { setAvatarBusy(false) }
  }

  // ----- Email change flow -----
  const [emailNew,     setEmailNew]     = useState('')
  const [emailStep,    setEmailStep]    = useState<'idle' | 'code'>('idle')
  const [emailCode,    setEmailCode]    = useState('')
  const [emailPending, setEmailPending] = useState('')
  const [emailBusy,    setEmailBusy]    = useState(false)
  const [emailMsg,     setEmailMsg]     = useState<any>(null)

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

  // ----- Dependents -----
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

  // ----- Password -----
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
        <h1 className="font-display text-2xl font-extrabold text-brand-950 dark:text-brand-50">بياناتي</h1>
        <p className="text-brand-600 dark:text-brand-400 text-sm">إدارة معلوماتك وأفراد عائلتك</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main info form */}
        <div className="lg:col-span-2 card">
          <div className="px-6 py-4 border-b border-brand-100 dark:border-brand-700">
            <h3 className="font-bold text-brand-950 dark:text-brand-50">المعلومات الشخصية</h3>
          </div>
          <form onSubmit={saveInfo} className="p-6 grid sm:grid-cols-2 gap-4">
            <F label="الاسم الكامل"  v={form.full_name}        on={(v: string) => set('full_name', v)} />
            <F label="رقم الجوال"    v={form.phone}             on={(v: string) => set('phone', v)} />
            <div>
              <label className="label">البريد الإلكتروني</label>
              <div className="input dark:bg-brand-800 dark:border-brand-600 bg-brand-50/40 dark:bg-brand-800/60 flex items-center justify-between gap-2 cursor-not-allowed">
                <span className="text-brand-700 dark:text-brand-300 truncate">{user.email || '— غير مسجل —'}</span>
                {user.email && (
                  user.email_verified
                    ? <span className="badge badge-approved text-[10px] shrink-0"><CheckCircle2 size={10}/> مؤكد</span>
                    : <span className="badge badge-pending text-[10px] shrink-0">غير مؤكد</span>
                )}
              </div>
              <p className="text-[11px] text-brand-500 mt-1">لتغيير البريد، استخدم البطاقة على اليسار</p>
            </div>
            <F label="رقم الهوية"   v={form.national_id ?? ''} on={(v: string) => set('national_id', v)} />
            <F label="الفرع/البطن"  v={form.branch ?? ''}      on={(v: string) => set('branch', v)} />
            <F label="المدينة"      v={form.city ?? ''}        on={(v: string) => set('city', v)} />
            <F label="تاريخ الميلاد" v={form.birth_date ?? ''} on={(v: string) => set('birth_date', v)} type="date" />
            <F label="العنوان"      v={form.address ?? ''}     on={(v: string) => set('address', v)} />
            <div className="sm:col-span-2">
              <label className="label">ملاحظات (اختياري)</label>
              <textarea
                className="input min-h-[72px] resize-y"
                value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value)}
                placeholder="أي معلومات إضافية..."
              />
            </div>

            {msg && (
              <div className={`sm:col-span-2 text-sm rounded-lg px-4 py-2.5 ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'}`}>
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

        {/* Right column */}
        <div className="space-y-6">
          {/* Avatar card */}
          <div className="card card-body">
            <div className="text-center">
              <div className="relative inline-block mb-3">
                <Avatar name={user.full_name} src={user.avatar} size={80} />
                {avatarBusy && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" size={22} />
                  </div>
                )}
              </div>
              <div className="font-bold text-brand-950 dark:text-brand-50">{user.full_name}</div>
              <div className="text-sm text-brand-500 dark:text-brand-400 mb-3">{ROLE_LABELS[user.role]}</div>
              <span className="badge badge-approved">الحساب مفعّل</span>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {avatarMsg && (
              <div className={`mt-3 text-xs rounded px-3 py-2 ${avatarMsg.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                {avatarMsg.text}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                className="btn-secondary flex-1 text-xs"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
              >
                <Camera size={14} /> تغيير الصورة
              </button>
              {user.avatar && (
                <button
                  className="btn-ghost !p-2 text-red-500 hover:text-red-600 dark:text-red-400"
                  onClick={removeAvatar}
                  disabled={avatarBusy}
                  title="حذف الصورة"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Email change */}
          <div className="card">
            <div className="px-5 py-4 border-b border-brand-100 dark:border-brand-700">
              <h3 className="font-bold text-brand-950 dark:text-brand-50 flex items-center gap-2">
                <Mail size={18} /> تغيير البريد الإلكتروني
              </h3>
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
                  <p className="text-[11px] text-brand-500 dark:text-brand-400">
                    سنرسل رمز تأكيد مكوّن من ٦ أرقام إلى البريد الجديد قبل تطبيق التغيير.
                  </p>
                  {emailMsg && (
                    <div className={`text-xs rounded px-3 py-2 ${emailMsg.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {emailMsg.text}
                    </div>
                  )}
                  <button className="btn-primary w-full" type="submit" disabled={emailBusy || !emailNew}>
                    {emailBusy && <Loader2 className="animate-spin" size={14} />}
                    إرسال رمز التأكيد
                  </button>
                </form>
              )}
              {emailStep === 'code' && (
                <form onSubmit={confirmEmailChange} className="space-y-3">
                  <div className="text-xs text-brand-600 dark:text-brand-400 bg-brand-50/60 dark:bg-brand-800/60 rounded px-3 py-2">
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
                    <div className={`text-xs rounded px-3 py-2 ${emailMsg.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {emailMsg.text}
                    </div>
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

          {/* Password change */}
          <div className="card">
            <div className="px-5 py-4 border-b border-brand-100 dark:border-brand-700">
              <h3 className="font-bold text-brand-950 dark:text-brand-50 flex items-center gap-2">
                <Lock size={18} /> تغيير كلمة المرور
              </h3>
            </div>
            <form onSubmit={changePwd} className="p-5 space-y-3">
              <input className="input" type="password" placeholder="كلمة المرور الحالية"
                value={pwd.current} onChange={e => setPwd({ ...pwd, current: e.target.value })} required />
              <input className="input" type="password" placeholder="كلمة المرور الجديدة"
                value={pwd.new} onChange={e => setPwd({ ...pwd, new: e.target.value })} required />
              <input className="input" type="password" placeholder="تأكيد كلمة المرور"
                value={pwd.confirm} onChange={e => setPwd({ ...pwd, confirm: e.target.value })} required />
              {pwdMsg && (
                <div className={`text-xs rounded px-3 py-2 ${pwdMsg.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {pwdMsg.text}
                </div>
              )}
              <button className="btn-secondary w-full" type="submit">تحديث</button>
            </form>
          </div>
        </div>
      </div>

      {/* Dependents */}
      <div className="card">
        <div className="px-6 py-4 border-b border-brand-100 dark:border-brand-700">
          <h3 className="font-bold text-brand-950 dark:text-brand-50">أفراد عائلتي</h3>
          <p className="text-xs text-brand-500 dark:text-brand-400 mt-0.5">يساعد ذلك لجنة المعونات على تقدير الحاجة</p>
        </div>
        <div className="p-6">
          {deps.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
              {deps.map(d => (
                <div key={d.id} className="bg-brand-50/60 dark:bg-brand-800/50 border border-brand-100 dark:border-brand-700 rounded-lg px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-brand-950 dark:text-brand-50 text-sm">{d.full_name}</div>
                    <div className="text-xs text-brand-500 dark:text-brand-400">{RELATION_LABELS[d.relation]}{d.birth_year ? ` · ${d.birth_year}` : ''}</div>
                  </div>
                  <button onClick={() => delDep(d.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded p-1"><Trash2 size={16} /></button>
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
