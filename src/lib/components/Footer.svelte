<script lang="ts">
	import { tick } from 'svelte';

	let {
		gameState,
		currentInput = $bindable(''),
		isGuessing = false,
		handleGuess,
		shareResult,
		restartGame
	}: {
		gameState: 'playing' | 'won' | 'lost';
		currentInput?: string;
		isGuessing?: boolean;
		handleGuess: (e: SubmitEvent) => void | Promise<void>;
		shareResult: () => void;
		restartGame: () => void;
	} = $props();

	let guessInput = $state<HTMLInputElement>();

	async function onSubmit(e: SubmitEvent) {
		await handleGuess(e);
		if (gameState === 'playing') {
			await tick();
			guessInput?.focus();
		}
	}
</script>

<footer class="fixed bottom-0 w-full bg-white border-t border-slate-200 p-4 pb-6">
	<div class="max-w-md mx-auto">
		{#if gameState === 'playing'}
			<form onsubmit={onSubmit} class="flex gap-2">
				<input
					type="text"
					bind:this={guessInput}
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
