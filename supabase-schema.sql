-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target TEXT NOT NULL,
  traits TEXT[] NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_name TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT min_traits CHECK (array_length(traits, 1) >= 20),
  CONSTRAINT max_traits CHECK (array_length(traits, 1) <= 50)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_creator ON submissions(creator_id);
CREATE INDEX IF NOT EXISTS idx_submissions_target ON submissions(LOWER(target));
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);

-- Daily generated words table
-- This table stores the secret target and traits for one public puzzle per date.
CREATE TABLE IF NOT EXISTS daily_words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_date DATE NOT NULL UNIQUE,
  target TEXT NOT NULL,
  traits TEXT[] NOT NULL,
  creator_name TEXT NOT NULL DEFAULT 'Cursor AI',
  source TEXT NOT NULL DEFAULT 'cursor',
  model TEXT,
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT daily_words_min_traits CHECK (array_length(traits, 1) >= 20),
  CONSTRAINT daily_words_max_traits CHECK (array_length(traits, 1) <= 50)
);

CREATE INDEX IF NOT EXISTS idx_daily_words_game_date ON daily_words(game_date DESC);

ALTER TABLE daily_words ENABLE ROW LEVEL SECURITY;

-- Intentionally no anon/authenticated SELECT policy:
-- the game reads and checks guesses through SvelteKit server routes using the service role key.
-- This prevents clients from downloading target/traits directly from Supabase.

-- RLS Policies
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view approved submissions
CREATE POLICY "Anyone can view approved submissions"
  ON submissions FOR SELECT
  USING (status = 'approved');

-- Policy: Users can create their own submissions
CREATE POLICY "Users can create submissions"
  ON submissions FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

-- Policy: Users can view their own submissions (any status)
CREATE POLICY "Users can view own submissions"
  ON submissions FOR SELECT
  USING (auth.uid() = creator_id);

-- Policy: Admin can view all submissions
-- Note: This requires setting up a custom claim 'role' = 'admin' in Supabase Auth
CREATE POLICY "Admin can view all submissions"
  ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Policy: Admin can update any submission
CREATE POLICY "Admin can update submissions"
  ON submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Policy: Admin can delete submissions
CREATE POLICY "Admin can delete submissions"
  ON submissions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
    )
  );

-- Function to check if user is admin (helper function)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (auth.users.raw_user_meta_data->>'role')::text = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
