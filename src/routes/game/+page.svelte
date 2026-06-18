<script lang="ts">
	import type { PageData } from './$types';
	import Avatar from '$lib/components/Avatar.svelte';
	import ClueBoard from '$lib/components/ClueBoard.svelte';

	let { data }: { data: PageData } = $props();

	const MAX_GUESSES = 20;

	type GuessResponse =
		| { result: 'target'; target: string }
		| { result: 'trait'; trait: string }
		| { result: 'miss' };
	type WebAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

	// Game state - matching React implementation
	let guesses = $state<string[]>([]);
	let foundTraits = $state<string[]>([]);
	let gameState = $state<'playing' | 'won' | 'lost'>('playing');
	let currentInput = $state('');
	let isGuessing = $state(false);
	let startTime = $state(Date.now());
	let endTime = $state<number | null>(null);
	let avatarState = $state<'idle' | 'happy' | 'sad' | 'win'>('idle');
	let avatarMessage = $state('Gue lagi mikir sesuatu nih. Coba tebak karakteristiknya!');
	let soundEnabled = $state(true);

	let dailyWord = $derived(data.dailyWord);

	function normalizeGuess(value: string) {
		return value.trim().toLowerCase().replace(/\s+/g, '_');
	}

	// Sound synthesizer
	function playSound(type: 'hit' | 'miss' | 'win') {
		try {
			const AudioContextConstructor =
				window.AudioContext || (window as WebAudioWindow).webkitAudioContext;
			if (!AudioContextConstructor) return;
			const ctx = new AudioContextConstructor();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			const now = ctx.currentTime;

			if (type === 'hit') {
				osc.frequency.setValueAtTime(523.25, now);
				osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1);
				gain.gain.setValueAtTime(0.1, now);
				gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
				osc.start(now);
				osc.stop(now + 0.3);
			} else if (type === 'miss') {
				osc.type = 'sawtooth';
				osc.frequency.setValueAtTime(150, now);
				gain.gain.setValueAtTime(0.1, now);
				osc.start(now);
				osc.stop(now + 0.2);
			} else if (type === 'win') {
				osc.frequency.setValueAtTime(440, now);
				osc.frequency.setValueAtTime(659, now + 0.2);
				gain.gain.setValueAtTime(0.1, now);
				osc.start(now);
				osc.stop(now + 0.5);
			}
		} catch {
			// Ignore errors
		}
	}

	async function handleGuess(e: SubmitEvent) {
		e.preventDefault();
		if (!currentInput.trim() || gameState !== 'playing' || isGuessing) return;

		const guess = normalizeGuess(currentInput);
		if (guesses.includes(guess)) return;

		isGuessing = true;

		try {
			const response = await fetch('/api/guess', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					game_date: dailyWord.game_date,
					guess
				})
			});

			if (!response.ok) {
				throw new Error('Guess request failed');
			}

			const result = (await response.json()) as GuessResponse;

			// Update guesses state directly, matching React implementation
			const newGuesses = [...guesses, guess];
			guesses = newGuesses;
			currentInput = '';

			const isTarget = result.result === 'target';

			if (isTarget) {
				gameState = 'won';
				endTime = Date.now();
				avatarState = 'win';
				avatarMessage = `YES! Jawabannya ${result.target}!`;
				if (soundEnabled) playSound('win');
			} else if (result.result === 'trait') {
				// Update foundTraits state directly, matching React implementation
				foundTraits = foundTraits.includes(result.trait) ? foundTraits : [...foundTraits, result.trait];
				avatarState = 'happy';
				avatarMessage = 'Bener banget! Itu karakteristiknya.';
				if (soundEnabled) playSound('hit');
			} else {
				avatarState = 'sad';
				avatarMessage = 'Bukan tuh.';
				if (soundEnabled) playSound('miss');
			}

			if (!isTarget && newGuesses.length >= MAX_GUESSES) {
				gameState = 'lost';
				endTime = Date.now();
				avatarMessage = 'Kesempatan habis! Coba lagi besok.';
			}

			if (gameState === 'playing' && !isTarget) {
				setTimeout(() => {
					avatarState = 'idle';
				}, 1500);
			}
		} catch {
			avatarState = 'sad';
			avatarMessage = 'Tebakan gagal dikirim. Coba lagi.';
		} finally {
			isGuessing = false;
		}
	}

	function getFormattedTime() {
		const end = endTime || Date.now();
		const start = startTime || Date.now();
		const s = Math.floor((end - start) / 1000);
		return `${Math.floor(s / 60)
			.toString()
			.padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
	}

	function shareResult() {
		const score = gameState === 'won' ? guesses.length : 'X';
		navigator.clipboard.writeText(
			`🕵️ TebaKata ${dailyWord.game_date}\nSkor: ${score}/${MAX_GUESSES}\nWaktu: ${getFormattedTime()}\n#TebaKata`
		);
		alert('Tersalin!');
	}

	function restartGame() {
		window.location.reload();
	}

	function toggleSound() {
		soundEnabled = !soundEnabled;
	}
</script>

<svelte:head>
	<title>TebaKata</title>
	<meta name="description" content="Game tebak kata dengan gaya 20 pertanyaan" />
</svelte:head>

<div class="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col items-center">
	<!-- <header class="w-full bg-white shadow-sm p-4 sticky top-0 z-10">
		<div class="max-w-md mx-auto flex justify-between items-center">
			<div class="flex items-center space-x-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="text-indigo-600"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
					<path d="M12 17h.01" />
				</svg>
				<h1 class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
					TebaKata
				</h1>
			</div>
		</div>
	</header> -->

	<main class="flex-1 w-full max-w-md p-4 flex flex-col space-y-4 pb-24">
		<div
			class="bg-white rounded-3xl p-4 shadow-sm min-h-[220px] flex flex-col justify-center border border-slate-200"
		>
			<Avatar status={avatarState} message={avatarMessage} />


			<div class="flex items-center space-x-3">
				<button
					onclick={toggleSound}
					class="p-2 rounded-full hover:bg-slate-100 transition-colors"
					aria-label={soundEnabled ? 'Matikan suara' : 'Nyalakan suara'}
				>
					{#if soundEnabled}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
							<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
						</svg>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<line x1="2" y1="2" x2="22" y2="22" />
							<path d="M18.89 13.23A7.12 7.12 0 0 0 19 12a7 7 0 0 0-4.93-6.7" />
							<path d="M5 10a7 7 0 0 0 6 6.81" />
							<polyline points="9 9 3 3 12 12 21 21" />
							<line x1="12" y1="19" x2="12" y2="23" />
						</svg>
					{/if}
				</button>
				<div
					class="px-3 py-1 rounded-full text-sm font-bold transition-colors"
					class:bg-red-100={guesses.length > 15}
					class:text-red-700={guesses.length > 15}
					class:bg-slate-100={guesses.length <= 15}
				>
					{guesses.length}/{MAX_GUESSES}
				</div>
			</div>
		</div>

		<ClueBoard traits={foundTraits} />

		{#if dailyWord.creator_name && dailyWord.creator_name !== 'System'}
			<div class="text-center text-xs text-gray-500">
				Kata oleh: <span class="font-semibold">{dailyWord.creator_name}</span>
			</div>
		{/if}
	</main>

	<footer class="fixed bottom-0 bg-white border-t border-slate-200 p-4 pb-6">
		<div class="max-w-md mx-auto">
			{#if gameState === 'playing'}
				<form onsubmit={handleGuess} class="flex gap-2">
					<input
						type="text"
						bind:value={currentInput}
						placeholder="Karakteristik atau kata..."
						disabled={isGuessing}
						class="flex-1 bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all font-medium text-lg disabled:opacity-60"
					/>
					<button
						type="submit"
						disabled={isGuessing || !currentInput.trim()}
						aria-busy={isGuessing}
						class="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
						aria-label="Kirim tebakan"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<line x1="22" y1="2" x2="11" y2="13" />
							<polygon points="22 2 15 22 11 13 2 9 22 2" />
						</svg>
					</button>
				</form>
			{:else}
				<div class="flex flex-col space-y-3">
					<button
						onclick={shareResult}
						class="w-full bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="18" cy="5" r="3" />
							<circle cx="6" cy="12" r="3" />
							<circle cx="18" cy="19" r="3" />
							<line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
							<line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
						</svg>
						Share Hasil
					</button>
					<button
						onclick={restartGame}
						class="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="23 4 23 10 17 10" />
							<polyline points="1 20 1 14 7 14" />
							<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
						</svg>
						Tantangan Selanjutnya
					</button>
				</div>
			{/if}
		</div>
	</footer>
</div>
