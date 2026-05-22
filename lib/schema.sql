-- ============================================================
--  صندوق أكناف القربى - عائلة البادي
--  Postgres schema for Vercel Postgres / Neon / Supabase
-- ============================================================

CREATE TYPE member_role   AS ENUM ('member','aid_committee','secretary','treasurer','president','admin');
CREATE TYPE member_status AS ENUM ('pending','active','suspended');
CREATE TYPE payment_type  AS ENUM ('subscription','donation','zakat','other');
CREATE TYPE payment_method AS ENUM ('bank_transfer','stc_pay','gateway','cash');
CREATE TYPE payment_status AS ENUM ('pending','approved','rejected');
CREATE TYPE aid_type      AS ENUM ('medical','marriage','education','debt','housing','death','urgent','other');
CREATE TYPE aid_status    AS ENUM ('submitted','under_review','approved','rejected','disbursed');
CREATE TYPE news_category AS ENUM ('announcement','wedding','condolence','meeting','achievement','general');
CREATE TYPE relation_type AS ENUM ('spouse','son','daughter','father','mother','other');

-- ----------------------------
--  الأعضاء (المستخدمون)
-- ----------------------------
CREATE TABLE members (
  id             SERIAL PRIMARY KEY,
  full_name      VARCHAR(150) NOT NULL,
  national_id    VARCHAR(20),
  phone          VARCHAR(20)  NOT NULL UNIQUE,
  email          VARCHAR(150) UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  branch         VARCHAR(100),
  birth_year     SMALLINT,
  birth_date     DATE,
  city           VARCHAR(80),
  address        VARCHAR(255),
  password_hash  VARCHAR(255) NOT NULL,
  role           member_role   NOT NULL DEFAULT 'member',
  status         member_status NOT NULL DEFAULT 'pending',
  theme          VARCHAR(10)  NOT NULL DEFAULT 'system',
  avatar         VARCHAR(255),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_role   ON members(role);
CREATE INDEX idx_members_natid  ON members(national_id) WHERE national_id IS NOT NULL;

-- ----------------------------
--  تأكيد البريد الإلكتروني
-- ----------------------------
CREATE TABLE IF NOT EXISTS email_verifications (
  id          SERIAL PRIMARY KEY,
  member_id   INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  email       VARCHAR(150) NOT NULL,
  code_hash   VARCHAR(120) NOT NULL,
  purpose     VARCHAR(30)  NOT NULL DEFAULT 'register',
  attempts    SMALLINT     NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_email_ver_member ON email_verifications(member_id);
CREATE INDEX idx_email_ver_active ON email_verifications(member_id, used_at, expires_at);

-- ----------------------------
--  أفراد عائلة العضو
-- ----------------------------
CREATE TABLE family_dependents (
  id         SERIAL PRIMARY KEY,
  member_id  INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  full_name  VARCHAR(150) NOT NULL,
  relation   relation_type NOT NULL,
  birth_year SMALLINT,
  notes      VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_deps_member ON family_dependents(member_id);

-- ----------------------------
--  الجلسات
-- ----------------------------
CREATE TABLE sessions (
  token      CHAR(64) PRIMARY KEY,
  member_id  INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  ip         VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sessions_member ON sessions(member_id);
CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

-- ----------------------------
--  الدفعات
-- ----------------------------
CREATE TABLE payments (
  id              SERIAL PRIMARY KEY,
  member_id       INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  currency        CHAR(3) NOT NULL DEFAULT 'SAR',
  payment_type    payment_type   NOT NULL DEFAULT 'subscription',
  method          payment_method NOT NULL,
  reference       VARCHAR(100),
  receipt_path    VARCHAR(500),
  status          payment_status NOT NULL DEFAULT 'pending',
  period_year     SMALLINT,
  period_month    SMALLINT,
  notes           TEXT,
  reviewed_by     INT REFERENCES members(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  reviewer_notes  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_member ON payments(member_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ----------------------------
--  المصروفات
-- ----------------------------
CREATE TABLE expenses (
  id             SERIAL PRIMARY KEY,
  title          VARCHAR(200) NOT NULL,
  category       VARCHAR(80),
  amount         NUMERIC(12,2) NOT NULL,
  expense_date   DATE NOT NULL,
  recipient      VARCHAR(150),
  description    TEXT,
  attachment     VARCHAR(500),
  related_aid_id INT,
  created_by     INT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- ----------------------------
--  طلبات المعونات
-- ----------------------------
CREATE TABLE aid_requests (
  id                SERIAL PRIMARY KEY,
  member_id         INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  aid_type          aid_type NOT NULL,
  requested_amount  NUMERIC(12,2),
  title             VARCHAR(200) NOT NULL,
  description       TEXT NOT NULL,
  dependents_count  SMALLINT,
  monthly_income    NUMERIC(12,2),
  attachment        VARCHAR(500),
  status            aid_status NOT NULL DEFAULT 'submitted',
  approved_amount   NUMERIC(12,2),
  committee_notes   TEXT,
  reviewed_by       INT REFERENCES members(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  disbursed_at      TIMESTAMPTZ,
  confidential      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_aid_member ON aid_requests(member_id);
CREATE INDEX idx_aid_status ON aid_requests(status);

-- ----------------------------
--  تحديثات طلبات المعونات
-- ----------------------------
CREATE TABLE aid_updates (
  id          SERIAL PRIMARY KEY,
  aid_id      INT NOT NULL REFERENCES aid_requests(id) ON DELETE CASCADE,
  author_id   INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_aid_updates_aid ON aid_updates(aid_id);

-- ----------------------------
--  الأخبار
-- ----------------------------
CREATE TABLE news (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(220) NOT NULL,
  category     news_category NOT NULL DEFAULT 'general',
  summary      VARCHAR(400),
  body         TEXT NOT NULL,
  cover_image  VARCHAR(500),
  is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
  is_public    BOOLEAN NOT NULL DEFAULT FALSE,
  author_id    INT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_news_pub ON news(published_at DESC);

-- ----------------------------
--  الإشعارات
-- ----------------------------
CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  member_id  INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  type       VARCHAR(40) NOT NULL,
  title      VARCHAR(200) NOT NULL,
  body       VARCHAR(500),
  link       VARCHAR(200),
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_member ON notifications(member_id, is_read);

-- ----------------------------
--  إعدادات الصندوق
-- ----------------------------
CREATE TABLE settings (
  key_name  VARCHAR(80) PRIMARY KEY,
  key_value TEXT
);

-- بيانات افتراضية (مأخوذة من شهادة الترخيص الرسمية + الكليشة)
INSERT INTO settings (key_name, key_value) VALUES
  ('fund_name',              'أكناف القربى'),
  ('family_name',            'عائلة البادي'),
  ('organization_type',      'صندوق عائلي'),
  ('supervised_by',          'المركز الوطني لتنمية القطاع غير الربحي'),
  ('unified_national_number','7053181991'),
  ('license_number',         '1200775200'),
  ('license_date',           '2025-12-31'),
  ('license_expires_at',     '2029-12-31'),
  ('subscription_amount',    '1200'),
  ('subscription_period',    'yearly'),
  ('bank_name',              'البنك الأهلي السعودي'),
  ('bank_iban',              'SA0000000000000000000000'),
  ('bank_account_name',      'صندوق أكناف القربى - عائلة البادي'),
  ('stc_pay_number',         '0539669988'),
  ('whatsapp_number',        '0539669988'),
  ('phone',                  '0539669988'),
  ('email',                  'info@aknafalqurba.com'),
  ('founded_year',           '2025'),
  ('about',                  'صندوق أكناف القربى - عائلة البادي. منظمة غير ربحية مرخصة من المركز الوطني لتنمية القطاع غير الربحي، تهدف إلى تعزيز روابط القربى وتقديم الدعم المالي والاجتماعي لأبناء عائلة البادي.'),
  ('objectives',             'تعزيز صلة الرحم - بث روح التكافل - التآلف والرحمة بين أفراد العائلة - إصلاح ذات البين - التعاون على البر والتقوى - المساهمة في تنظيم أوجه الإحسان بين أفراد العائلة - المساهمة في تعليم وتدريب وتطوير أفراد العائلة');

-- ملاحظة: لإنشاء حساب المدير الأول، افتح بعد الـ deploy:
--   https://yourapp.vercel.app/setup
-- صفحة /setup تعمل مرة واحدة فقط ثم تُغلق نفسها.
