# PRD v2: "Daily Guess" (Trait Edition)

### 1. Core Gameplay Mechanics (Updated)

The game is no longer about asking questions like "Can it swim?"; it is about guessing **Characteristics (Tags)** to narrow down the **Entity**.

* **The Daily Data:** A JSON object containing the **Target Word** (e.g., "Camel") and a list of **Valid Traits** (e.g., "Animal", "Mammal", "Herbivore", "Desert", "Hump", "Rideable").
* **The Input:** User types a single word.
* **The Logic:**
1. **Exact Match:** If Input == Target Word  **WIN**.
2. **Trait Match:** If Input is in the `Valid Traits` list  **YES** (Avatar bounces, trait is revealed on a "Clue Board").
3. **No Match:** If Input is neither  **NO** (Avatar shakes head).


* **The "20 Questions" Constraint:** The user has 20 "slots" of history. A "No" uses up a slot. A "Yes" (revealing a trait) also uses a slot but gives value.

### 2. The Avatar & Feedback (UI)

* **The Avatar:** Still the central feedback mechanism.
* **Trait Found:** Avatar smiles/bounces. A speech bubble appears: *"Yes! That's a match."* The word is added to a visible list of "Known Clues."
* **Wrong Guess:** Avatar looks confused/sad. Speech bubble: *"Nope, not related."*
* **Win:** Avatar celebrates.


* **Sound:**
* *Ding:* Found a trait.
* *Buzz:* Wrong guess.
* *Fanfare:* Found the word.



### 3. Data Generation (The AI Role)

You will use a backend script (running once/day) to call OpenAI.

**Prompt Logic:**

> "Generate a random entity for a guessing game (Person, Place, Object, or Animal). Return it as JSON with the 'target' and a list of 30-50 'traits'. The traits must be single words (nouns or adjectives) that describe the target. Include synonyms."

**Example JSON Output:**

```json
{
  "date": "2023-10-28",
  "target": "Camel",
  "traits": [
    "animal", "mammal", "herbivore", "desert", "sand", "hump", 
    "humps", "tall", "rideable", "water", "brown", "africa", 
    "middle_east", "transport", "living", "creature" 
  ]
}

```

---

# Technical Requirements (Svelte + Tailwind)

This stack is even better now because the game logic is pure JavaScript state management, which Svelte excels at.

### 1. Architecture

* **Frontend:** SvelteKit (Static Site Generation or Server-Side Rendering).
* **Styling:** TailwindCSS (for the grid of clues and the chat layout).
* **Backend (Data):** A simple JSON file hosted on Vercel Edge Config, Supabase, or even just a static JSON file in the repo if you rebuild daily.

### 2. Security Strategy

Since the "Game Master" is no longer an AI on the server, you have to decide where the logic happens:

* **Option A: Client-Side (Fast but Hackable)**
You send the full JSON (Target + Traits) to the browser.
* *Pros:* Instant feedback, works offline after load.
* *Cons:* Tech-savvy users can inspect "Network" or "Console" to see the answer.


* **Option B: Serverless (Secure - Recommended)**
The Svelte frontend sends the user's guess to a generic API endpoint `/api/guess`.
* The API checks the secret list.
* The API returns `{ result: "hit", type: "trait" }` or `{ result: "miss" }`.
* *Pros:* Impossible to cheat.



### 3. Svelte Component Structure

You will need a clean separation of concerns.

1. **`GameStore.ts` (Svelte Store):**
* Manages `guesses[]` (array of user inputs).
* Manages `foundTraits[]` (subset of guesses that were correct traits).
* Manages `gameState` ('playing', 'won', 'lost').


2. **`Avatar.svelte`:**
* Accepts a prop `status` ('idle', 'happy', 'sad').
* Uses CSS animations for the bounce.


3. **`ClueBoard.svelte`:**
* Displays the tags found so far using Tailwind badges (e.g., `<span class="bg-green-200 text-green-800 px-2 rounded-full">Mammal</span>`).


## Gemini API Integration
Yes, you can absolutely use the **Gemini API** (via Google AI Studio) to automate this. Since your PRD requires the word to be generated **once a day** and shared by **everyone**, you have two ways to implement this:

### 1. The "Serverless" Approach (Recommended for Production)

You would set up a simple automated script (using GitHub Actions or a Vercel Cron Job) that runs once every 24 hours.

* **The Script:** Calls the Gemini API with a prompt like: *"Generate a daily secret word and 30 descriptive traits for a guessing game. Output as JSON."*
* **The Storage:** The script saves that JSON to a database (like Firestore).
* **The App:** Your Svelte app simply fetches the "today" document from your database when the user loads the page.

### 2. The "Client-Side" Approach (Good for Prototyping)

If you want to keep it entirely inside the frontend code for now, you can use the user's local date as a **seed**. However, to ensure *everyone* gets the same word, you would use the API directly in the app with a specific system instruction.

I have updated your code to include a **Gemini Integration Module**. It uses the `gemini-2.5-flash-preview-09-2025` model to fetch a unique word based on the current date.

### Key Changes Made:

1. **AI Integration:** Added `fetchDailyWordFromAI()` which uses your Gemini API key to generate the target word and its traits dynamically.
2. **Date-Awareness:** The AI is instructed to generate a word specifically for *today's date*, which helps keep all users in sync.
3. **Loading/Error States:** Added a loading spinner and an error screen (with exponential backoff) to handle API delays or connectivity issues.
4. **Security Note:** In a real production app, you should never put the `apiKey` in the frontend code. You would use a **Serverless Function** (like an API route in SvelteKit or Next.js) to keep the key hidden and proxy the request to Google.