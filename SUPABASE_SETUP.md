# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be ready

## 2. Get API Keys

1. Go to Project Settings > API
2. Copy the following:
   - Project URL → `PUBLIC_SUPABASE_URL`
   - Publishable key → `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## 3. Setup Environment Variables

Create a `.env` file in the project root:

```env
PUBLIC_SUPABASE_URL=your_project_url
PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Daily AI generation (server-only)
CURSOR_API_KEY=your_openai_compatible_api_key
CURSOR_API_BASE_URL=https://api.openai.com/v1
CURSOR_API_MODEL=gpt-4o-mini
CRON_SECRET=make_this_a_long_random_secret
DAILY_WORD_TIME_ZONE=Asia/Jakarta

# Optional stock image provider for the winner reveal
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
# or
PEXELS_API_KEY=your_pexels_api_key
```

`CURSOR_API_KEY` is used only from SvelteKit server routes. The implementation expects an
OpenAI-compatible chat-completions API. If your Cursor setup uses another provider or gateway,
set `CURSOR_API_BASE_URL` and `CURSOR_API_MODEL` to that provider's values.

Wikipedia summaries are fetched daily from Wikipedia's public API. Stock images are fetched daily
from Unsplash when `UNSPLASH_ACCESS_KEY` is configured, or Pexels when `PEXELS_API_KEY` is
configured. If neither stock key is configured, the game still works but only the wiki reveal is
available.

## 4. Run Database Schema

1. Go to Supabase Dashboard > SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Run the SQL script
4. This will create:
   - `submissions` table
   - `daily_words` table for generated daily puzzles
   - Indexes for performance
   - Row Level Security (RLS) policies
5. The `daily_words` table intentionally does not expose target/traits to browser clients.
   The SvelteKit server reads it with `SUPABASE_SERVICE_ROLE_KEY` and checks guesses through
   `/api/guess`. The wiki and image reveal is also returned only by `/api/guess` after the exact
   daily word is guessed.

## 5. Configure Vercel Cron

1. Add the same environment variables above in Vercel Project Settings > Environment Variables.
2. Deploy the app to Vercel. `vercel.json` schedules `/api/cron/generate-daily-word` at
   `17:05 UTC`, which is `00:05` in `Asia/Jakarta`.
3. Vercel will send `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is configured.
4. To test manually after deployment, call:

```sh
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://yourdomain.com/api/cron/generate-daily-word
```

Use `?force=true` only when you intentionally want to replace the existing puzzle for that date.

## 6. Setup Admin User

To make a user an admin:

1. Go to Authentication > Users
2. Find the user you want to make admin
3. Click on the user
4. Go to "Raw User Meta Data"
5. Add: `{ "role": "admin" }`
6. Save

Or via SQL:

```sql
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'your-admin-email@example.com';
```

## 7. Configure Email Settings (Important for Email Confirmation)

If users are being created but not receiving confirmation emails, check these settings:

1. Go to **Authentication > URL Configuration**
   - Set **Site URL** to your production URL (e.g., `https://yourdomain.com`)
   - For development, use `http://localhost:5173` (or your dev port)
   - Add redirect URLs:
     - `http://localhost:5173/**` (for local development)
     - `https://yourdomain.com/**` (for production)

2. Go to **Authentication > Email Templates**
   - Verify that "Confirm signup" template is enabled
   - Check that email templates are configured correctly

3. Go to **Authentication > Providers > Email**
   - Ensure **Enable email confirmations** is enabled (or disabled if you want auto-confirm)
   - If enabled, users must verify their email before they can sign in
   - If disabled, users are auto-confirmed (no email sent)

4. **Free Tier Rate Limits:**
   - Supabase free tier has email rate limits (around 4 emails/hour per project)
   - For production, consider setting up custom SMTP in **Project Settings > Auth > SMTP Settings**

5. **Check Spam Folder:**
   - Confirmation emails may end up in spam/junk folders
   - Check the email you registered with

6. **For Local Development:**
   - You can disable email confirmation temporarily
   - Or use the magic link in the Supabase logs/dashboard
   - Or manually confirm users in **Authentication > Users** dashboard

## 8. Test the Setup

1. Start the dev server: `pnpm dev`
2. Register a new user at `/auth`
3. Check email for confirmation link (or confirm manually in Supabase dashboard)
4. Login and submit a word at `/submit`
5. Login as admin and review at `/admin`
6. Visit `/game` and make guesses. Results can be shared with score and time.

## Notes

- The game will fallback to mock data if daily generation is not configured yet
- Only approved submissions appear in the game
- RLS policies ensure users can only see their own pending submissions
- Daily generated answers stay server-side and are checked via `/api/guess`
- Admin role is checked via `user_metadata.role`
- If email confirmation is disabled, users can sign in immediately after registration