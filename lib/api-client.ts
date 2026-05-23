// Client-side API helper. All routes are under /api.
// Cookies are sent automatically (HttpOnly session cookie).

async function call(path: string, opts: RequestInit = {}) {
  const res  = await fetch(path, {
    credentials: 'same-origin',
    ...opts,
    headers: { ...(opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...opts.headers },
  })
  let data: any = {}
  try { data = await res.json() } catch {}
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `خطأ ${res.status}`) as Error & { code?: string; status?: number }
    err.code = data?.error
    err.status = res.status
    throw err
  }
  return data
}

const post  = (p: string, body?: any)  => call(p, { method: 'POST',  body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) })
const put   = (p: string, body?: any)  => call(p, { method: 'PUT',   body: JSON.stringify(body) })
const patch = (p: string, body?: any)  => call(p, { method: 'PATCH', body: JSON.stringify(body) })
const del   = (p: string)              => call(p, { method: 'DELETE' })
const get   = (p: string)              => call(p)

export const api = {
  auth: {
    register:        (d: any)       => post('/api/auth/register', d),
    login:           (i: string, p: string) => post('/api/auth/login', { identifier: i, password: p }),
    loginOtp:        (member_id: number, code: string) => post('/api/auth/login-otp', { member_id, code }),
    loginOtpResend:  (member_id: number) => call('/api/auth/login-otp', { method: 'PUT', body: JSON.stringify({ member_id }), headers: { 'Content-Type': 'application/json' } }),
    logout:          ()             => post('/api/auth/logout'),
    me:              ()             => get('/api/auth/me'),
    changePassword:  (cur: string, n: string) =>
      post('/api/auth/change-password', { current_password: cur, new_password: n }),
    verifyEmail:     (member_id: number, code: string) =>
      post('/api/auth/verify-email', { member_id, code }),
    resendVerification: (member_id: number) =>
      post('/api/auth/resend-verification', { member_id }),
    verifyId:        (member_id: number) => post('/api/auth/verify-id', { member_id }),
    verifyIdentityDoc: (member_id: number, id_document: string) =>
      post('/api/auth/verify-identity', { member_id, id_document }),
    extractId:       (id_document: string) => post('/api/auth/extract-id', { id_document }),
  },
  members: {
    list:         (status?: string) => get(`/api/members${status ? `?status=${status}` : ''}`),
    staff:        ()                => get('/api/members/staff'),
    directory:    ()                => get('/api/members/directory'),
    get:          (id: number)      => get(`/api/members/${id}`),
    delete:       (id: number)      => del(`/api/members/${id}`),
    update:       (d: any)          => post('/api/members/update', d),
    approve:      (id: number)      => post(`/api/members/${id}/approve`),
    setRole:      (id: number, role: string)   => post(`/api/members/${id}/role`,   { role }),
    setStatus:    (id: number, status: string) => post(`/api/members/${id}/status`, { status }),
    verifyEmailAdmin: (id: number)             => post(`/api/members/${id}/verify-email`),
    dependents:   (memberId?: number) => get(`/api/members/dependents${memberId ? `?member_id=${memberId}` : ''}`),
    addDependent: (d: any)          => post('/api/members/dependents', d),
    delDependent: (id: number)      => del(`/api/members/dependents/${id}`),
    emailChange:  (email: string)   => post('/api/members/email-change', { email }),
    emailConfirm: (code: string)    => post('/api/members/email-confirm', { code }),
    setTheme:     (theme: string)   => post('/api/members/theme', { theme }),
    avatarUpload:     (fd: FormData) => post('/api/members/avatar', fd),
    avatarRemove:     ()             => del('/api/members/avatar'),
    signatureUpload:  (fd: FormData) => post('/api/members/signature', fd),
    signatureRemove:  ()             => del('/api/members/signature'),
    idDocument:   (id: number)      => get(`/api/members/${id}/id-document`),
    familyRegisterExtract: (document: string) =>
      post('/api/members/family-register', { document }),
    familyRegisterSave: (members: any[]) =>
      call('/api/members/family-register', {
        method: 'PUT',
        body: JSON.stringify({ members }),
        headers: { 'Content-Type': 'application/json' },
      }),
  },
  payments: {
    create: (fd: FormData)          => post('/api/payments', fd),
    mine:   ()                      => get('/api/payments/mine'),
    list:   (status?: string)       => get(`/api/payments${status ? `?status=${status}` : ''}`),
    review: (id: number, decision: string, notes?: string) =>
      post(`/api/payments/${id}/review`, { decision, notes }),
    edit:   (id: number, data: object) => patch(`/api/payments/${id}`, data),
    remove: (id: number)            => del(`/api/payments/${id}`),
  },
  letterTemplates: {
    list:   ()             => get('/api/letter-templates'),
    create: (data: object) => post('/api/letter-templates', data),
    seed:   ()             => post('/api/letter-templates/seed'),
    remove: (id: number)   => del(`/api/letter-templates/${id}`),
  },
  costs: {
    list:   ()                          => get('/api/admin/costs'),
    create: (data: object)              => post('/api/admin/costs', data),
    update: (id: number, data: object)  => patch(`/api/admin/costs/${id}`, data),
    remove: (id: number)                => del(`/api/admin/costs/${id}`),
    usage:  ()                          => get('/api/admin/usage'),
  },
  letters: {
    list:    (box: 'outgoing' | 'incoming' | 'all' = 'outgoing') => get(`/api/letters?box=${box}`),
    get:     (id: number)                => get(`/api/letters/${id}`),
    create:  (data: object)              => post('/api/letters', data),
    update:  (id: number, data: object)  => patch(`/api/letters/${id}`, data),
    remove:  (id: number)                => del(`/api/letters/${id}`),
    approve: (id: number, data: object)  => post(`/api/letters/${id}/approve`, data),
  },
  expenses: {
    list:   ()                      => get('/api/expenses'),
    create: (fd: FormData)          => post('/api/expenses', fd),
    remove: (id: number)            => del(`/api/expenses/${id}`),
  },
  aid: {
    create: (fd: FormData)          => post('/api/aid', fd),
    mine:   ()                      => get('/api/aid/mine'),
    list:   (status?: string)       => get(`/api/aid${status ? `?status=${status}` : ''}`),
    get:    (id: number)            => get(`/api/aid/${id}`),
    updateStatus: (id: number, d: any) => post(`/api/aid/${id}/status`, d),
    addUpdate:    (id: number, d: any) => post(`/api/aid/${id}/updates`, d),
  },
  news: {
    list:   (category?: string)     => get(`/api/news${category ? `?category=${category}` : ''}`),
    get:    (id: number)            => get(`/api/news/${id}`),
    create: (fd: FormData)          => post('/api/news', fd),
    update: (id: number, fd: FormData) => post(`/api/news/${id}`, fd),
    remove: (id: number)            => del(`/api/news/${id}`),
  },
  reports: {
    dashboard:   ()                 => get('/api/reports/dashboard'),
    financial:   ()                 => get('/api/reports/financial'),
    memberStats: ()                 => get('/api/reports/member-stats'),
  },
  notifications: {
    mine:    ()                     => get('/api/notifications'),
    read:    (id: number)           => post('/api/notifications/read', { id }),
    readAll: ()                     => post('/api/notifications/read', { all: true }),
  },
  settings: {
    publicGet: ()                   => get('/api/settings/public'),
    all:       ()                   => get('/api/settings'),
    update:    (d: any)             => post('/api/settings', d),
  },
  gateway: {
    start:  (d: any)                => post('/api/gateway/start',  d),
    verify: (pid: number)           => get(`/api/gateway/verify?pid=${pid}`),
  },
  permissions: {
    list:   (member_id: number)               => get(`/api/permissions?member_id=${member_id}`),
    grant:  (member_id: number, permission: string) =>
      post('/api/permissions', { member_id, permission }),
    revoke: (member_id: number, permission: string) =>
      call('/api/permissions', { method: 'DELETE', body: JSON.stringify({ member_id, permission }), headers: { 'Content-Type': 'application/json' } }),
  },
  logs: {
    list: (action?: string, limit?: number) =>
      get(`/api/logs${action || limit ? `?${action ? `action=${action}` : ''}${action && limit ? '&' : ''}${limit ? `limit=${limit}` : ''}` : ''}`),
  },
}
