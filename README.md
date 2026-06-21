# TebaKata

Daily Indonesian word guessing game built with SvelteKit, Supabase, and Vercel.

Guess traits to uncover clues, then find the target word before your 20 guesses run out. Each day has one shared puzzle for all players. After winning, share your score and completion time.

## Features

- **Daily puzzle** — One AI-generated word per day (`Asia/Jakarta` timezone), shared by all players.
- **Trait-based guessing** — Submit characteristic guesses; matching traits are revealed on the clue board.
- **Server-side validation** — The answer and full trait list never reach the browser. Guesses are checked through `/api/guess`.
- **Winner reveal** — After guessing the target word, a reveal card shows a Wikipedia summary and, when configured, a stock photo from Unsplash or Pexels.
- **Score sharing** — Copy score and time from the result screen.
- **Community submissions** — Logged-in users can submit word ideas at `/submit`.
- **Admin review** — Admins approve or reject submissions at `/admin`; approved words can feed future puzzles.
- **Auth** — Supabase email/password sign-up and login at `/auth`.

## Routes

| Route | Description |
| --- | --- |
| `/` | Redirects to `/game` |
| `/game` | Main daily puzzle |
| `/about` | How the game works |
| `/auth` | Sign up / log in |
| `/submit` | Submit a word (requires login) |
| `/admin` | Review submissions (admin only) |

## Daily word generation

A Vercel Cron job calls `/api/cron/generate-daily-word` once per day (`00:05 Asia/Jakarta`).

1. The server uses `LLM_API_KEY` with an OpenAI-compatible chat-completions endpoint to generate one `target` and 30–50 `traits`.
2. Wikipedia metadata and an optional stock image are fetched and stored alongside the puzzle.
3. The result is upserted into Supabase `daily_words` by `game_date`.
4. `/game` loads only public puzzle metadata (date, creator, trait count). Guesses go to `/api/guess`.
5. On a correct target guess, `/api/guess` returns the reveal payload (wiki summary + image). Until then, the answer stays server-side.

If daily generation is not configured yet, the game falls back to built-in mock data.

See [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) for database schema, environment variables, Vercel cron setup, and admin configuration.

## Tech stack

- [SvelteKit 2](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (auth, database, RLS)
- [Vercel](https://vercel.com/) (hosting + cron)

## Getting started

```sh
# Install dependencies
npm install

# Create .env with required variables (see SUPABASE_SETUP.md)

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — you'll land on `/game`.

## Scripts

```sh
npm run dev       # Start development server
npm run build     # Production build
npm run preview   # Preview production build
npm run check     # Type-check with svelte-check
npm run lint      # ESLint
```

## Manual cron trigger

After deployment, you can generate today's puzzle manually:

```sh
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://localhost:5173/api/cron/generate-daily-word
```

Add `?force=true` only when you intentionally want to replace the existing puzzle for that date.
