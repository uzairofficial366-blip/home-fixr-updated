import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;
let _schemaReady: Promise<void> | null = null;

export function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured");
    _sql = neon(url);
  }
  return _sql;
}

export async function expireTimedOutJobs() {
  const sql = getSql();
  await sql`
    UPDATE jobs j
    SET status = 'expired'
    WHERE j.status = 'open'
      AND j.created_at <= NOW() - INTERVAL '10 minutes'
      AND NOT EXISTS (
        SELECT 1
        FROM bids b
        WHERE b.job_id = j.id
      )
  `;
}

export async function ensureSchema() {
  if (_schemaReady) return _schemaReady;
  const sql = getSql();
  _schemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('homeowner','provider','admin')),
      phone TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS provider_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT DEFAULT '',
      categories TEXT[] DEFAULT '{}',
      hourly_rate NUMERIC(10,2) DEFAULT 0,
      years_experience INTEGER DEFAULT 0,
      is_available BOOLEAN NOT NULL DEFAULT true,
      profile_picture_url TEXT,
      id_document_url TEXT,
      license_document_url TEXT,
      verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','pending','verified','rejected')),
      verification_notes TEXT DEFAULT ''
    )`;
    await sql`ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true`;
    await sql`ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT`;
    await sql`CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      homeowner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      address TEXT NOT NULL,
      preferred_date DATE,
      preferred_time TEXT,
      estimated_hours NUMERIC(6,2),
      estimated_days NUMERIC(6,2),
      additional_notes TEXT DEFAULT '',
      budget NUMERIC(10,2),
      ai_suggested_min NUMERIC(10,2),
      ai_suggested_max NUMERIC(10,2),
      ai_reasoning TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled','expired')),
      accepted_bid_id INTEGER,
      completion_requested_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preferred_date DATE`;
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS preferred_time TEXT`;
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(6,2)`;
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_days NUMERIC(6,2)`;
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS additional_notes TEXT DEFAULT ''`;
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completion_requested_at TIMESTAMPTZ`;
    await sql`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`;
    await sql`ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check`;
    await sql`ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('open','in_progress','completed','cancelled','expired'))`;
    await sql`CREATE TABLE IF NOT EXISTS job_photos (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hourly_rate NUMERIC(10,2) NOT NULL,
      hours_estimate NUMERIC(6,2) NOT NULL,
      equipment_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
      total NUMERIC(10,2) NOT NULL,
      message TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(job_id, provider_id)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      conversation_id INTEGER,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      attachment_url TEXT,
      attachment_name TEXT,
      attachment_type TEXT,
      attachment_size INTEGER,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      homeowner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(job_id, provider_id)
    )`;
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id INTEGER`;
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE`;
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT`;
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT`;
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT`;
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size INTEGER`;
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ`;
    await sql`CREATE TABLE IF NOT EXISTS verification_requests (
      id SERIAL PRIMARY KEY,
      provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
      full_name TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_description TEXT NOT NULL,
      id_document_url TEXT NOT NULL,
      license_document_url TEXT,
      admin_notes TEXT DEFAULT '',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )`;
    await sql`ALTER TABLE verification_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT ''`;
    await sql`CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(job_id, reviewer_id)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','held','released','refunded')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS job_broadcasts (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','customized')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      responded_at TIMESTAMPTZ,
      UNIQUE(job_id, provider_id)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS uploaded_documents (
      id SERIAL PRIMARY KEY,
      provider_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL DEFAULT '',
      mime_type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_jobs_homeowner ON jobs(homeowner_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_job_photos_job ON job_photos(job_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bids_job ON bids(job_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_job ON messages(job_id, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(job_id, homeowner_id, provider_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_job_broadcasts_provider ON job_broadcasts(provider_id, status, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_job_broadcasts_job ON job_broadcasts(job_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_provider_profiles_categories ON provider_profiles USING GIN (categories)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_provider_profiles_available ON provider_profiles(is_available, verification_status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_uploaded_documents_provider ON uploaded_documents(provider_id, uploaded_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_verification_requests_provider ON verification_requests(provider_id, submitted_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status, submitted_at DESC)`;
  })().catch((e) => {
    _schemaReady = null;
    throw e;
  });
  return _schemaReady;
}
