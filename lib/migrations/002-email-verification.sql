-- Email verification: confirm an email via a 6-digit code before it counts.
-- Re-runnable: uses IF NOT EXISTS where possible.

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS email_verifications (
  id          SERIAL PRIMARY KEY,
  member_id   INT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  email       VARCHAR(150) NOT NULL,           -- the email this code is verifying
  code_hash   VARCHAR(120) NOT NULL,           -- bcrypt of the 6-digit code
  purpose     VARCHAR(30) NOT NULL DEFAULT 'register',  -- register | change
  attempts    SMALLINT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_ver_member ON email_verifications(member_id);
CREATE INDEX IF NOT EXISTS idx_email_ver_active ON email_verifications(member_id, used_at, expires_at);
