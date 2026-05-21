-- Profile enhancements:
--   * birth_date (full DATE) replaces birth_year (kept for back-compat)
--   * theme preference per user
--   * make sure national_id has an index (used by login lookup)

ALTER TABLE members ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS theme VARCHAR(10) NOT NULL DEFAULT 'system';

CREATE INDEX IF NOT EXISTS idx_members_natid ON members(national_id) WHERE national_id IS NOT NULL;

-- Populate birth_date from legacy birth_year (Jan 1) if not already set
UPDATE members
SET birth_date = make_date(birth_year, 1, 1)
WHERE birth_year IS NOT NULL AND birth_date IS NULL;
