CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  stripe_customer_id TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  email_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  provider_message_id TEXT NOT NULL,
  sender_name TEXT,
  sender_email TEXT,
  subject TEXT,
  snippet TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_message_id, user_id)
);

CREATE TABLE email_group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(email_id)
);

CREATE TABLE user_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  sender_email TEXT NOT NULL,
  target_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sender_email)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) synced with Clerk JWT
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ LANGUAGE sql STABLE;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own data" ON users FOR ALL USING (id = auth.user_id());
CREATE POLICY "Email accounts access own data" ON email_accounts FOR ALL USING (user_id = auth.user_id());
CREATE POLICY "Groups access own data" ON groups FOR ALL USING (user_id = auth.user_id());
CREATE POLICY "Emails access own data" ON emails FOR ALL USING (user_id = auth.user_id());
CREATE POLICY "Assignments access own data" ON email_group_assignments FOR ALL USING (user_id = auth.user_id());
CREATE POLICY "Overrides access own data" ON user_overrides FOR ALL USING (user_id = auth.user_id());
CREATE POLICY "Notifications access own data" ON notifications FOR ALL USING (user_id = auth.user_id());

-- Enable Realtime
alter publication supabase_realtime add table email_group_assignments;
alter publication supabase_realtime add table groups;
