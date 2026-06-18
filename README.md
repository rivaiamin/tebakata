# TebaKata

Daily Indonesian word guessing game built with SvelteKit, Supabase, and Vercel.

## Daily word generation

- Vercel Cron calls `/api/cron/generate-daily-word` once per day.
- The server uses `CURSOR_API_KEY` with an OpenAI-compatible chat-completions endpoint to generate
  one `target` and 30-50 `traits`.
- The generated puzzle is upserted into Supabase `daily_words` by `game_date`.
- `/game` only receives public puzzle metadata. Guesses are checked through `/api/guess`, so the
  answer and traits are not sent directly to the browser.
- Players can share score and time from the game result screen.

See `SUPABASE_SETUP.md` for database schema and Vercel environment setup.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
