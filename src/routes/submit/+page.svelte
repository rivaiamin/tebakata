<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { user } from '$lib/stores/auth';
	import { supabase } from '$lib/supabase';
	import { onMount } from 'svelte';

	let target = $state('');
	let traitsInput = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let checkingDuplicate = $state(false);
	let isDuplicate = $state(false);

	onMount(() => {
		// Redirect if not logged in
		const unsubscribe = user.subscribe((u) => {
			if (!u) {
				goto(resolve('/auth'));
			}
		});

		return () => {
			unsubscribe();
		};
	});

	function parseTraits(input: string): string[] {
		return input
			.split(/[,\n]/)
			.map((t) => t.trim().toLowerCase())
			.filter((t) => t.length > 0);
	}

	async function checkDuplicate() {
		if (!target.trim()) return;

		checkingDuplicate = true;
		isDuplicate = false;

		try {
			const { data, error: checkError } = await supabase
				.from('submissions')
				.select('id')
				.eq('status', 'approved')
				.ilike('target', target.trim().toLowerCase())
				.limit(1);

			if (checkError) throw checkError;
			isDuplicate = (data?.length ?? 0) > 0;
		} catch (err) {
			console.error('Error checking duplicate:', err);
		} finally {
			checkingDuplicate = false;
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		success = null;

		if (!$user) {
			error = 'Kamu harus login dulu';
			return;
		}

		const traits = parseTraits(traitsInput);
		const targetWord = target.trim().toLowerCase();

		// Client-side validation
		if (!targetWord) {
			error = 'Kata target tidak boleh kosong';
			return;
		}

		if (targetWord.includes(' ') || targetWord.length < 2) {
			error = 'Kata target harus satu kata (minimal 2 karakter)';
			return;
		}

		if (traits.length < 20) {
			error = `Minimal 20 karakteristik (sekarang: ${traits.length})`;
			return;
		}

		if (traits.length > 50) {
			error = `Maksimal 50 karakteristik (sekarang: ${traits.length})`;
			return;
		}

		// Check for duplicate traits
		const uniqueTraits = [...new Set(traits)];
		if (uniqueTraits.length !== traits.length) {
			error = 'Ada karakteristik yang duplikat';
			return;
		}

		// Check if target is duplicate
		if (isDuplicate) {
			error = 'Kata ini sudah ada di database';
			return;
		}

		loading = true;

		try {
			const creatorName =
				$user.user_metadata?.username || $user.email?.split('@')[0] || 'Anonymous';

			const { error: submitError } = await supabase
				.from('submissions')
				.insert({
					target: targetWord,
					traits: uniqueTraits,
					creator_id: $user.id,
					creator_name: creatorName,
					status: 'pending'
				})
				.select()
				.single();

			if (submitError) throw submitError;

			success = 'Submission berhasil! Menunggu review admin.';
			target = '';
			traitsInput = '';
			isDuplicate = false;

			setTimeout(() => {
				goto(resolve('/'));
			}, 2000);
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Gagal submit. Coba lagi.';
		} finally {
			loading = false;
		}
	}

	const traits = $derived(parseTraits(traitsInput));
	const traitsCount = $derived(traits.length);
	const isValid = $derived(
		target.trim().length >= 2 &&
			!target.includes(' ') &&
			traitsCount >= 20 &&
			traitsCount <= 50 &&
			!isDuplicate
	);
</script>

<div class="min-h-screen bg-slate-100 p-4">
	<div class="max-w-2xl mx-auto">
		<div class="bg-white rounded-xl shadow-lg p-6 space-y-6">
			<div>
				<h1 class="text-2xl font-bold text-gray-800 mb-2">Submit Kata Baru</h1>
				<p class="text-gray-600">
					Bantu tambahkan kata dan karakteristiknya ke game TebaKata!
				</p>
			</div>

			{#if error}
				<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			{/if}

			{#if success}
				<div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
					{success}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-6">
				<div>
					<label for="target" class="block text-sm font-medium text-gray-700 mb-2">
						Kata Target <span class="text-red-500">*</span>
					</label>
					<input
						id="target"
						type="text"
						bind:value={target}
						oninput={checkDuplicate}
						placeholder="Contoh: Unta, Menara Eiffel, Borobudur"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
						required
					/>
					<p class="text-xs text-gray-500 mt-1">
						Satu kata atau frasa (akan diubah ke lowercase)
					</p>
					{#if checkingDuplicate}
						<p class="text-xs text-blue-500 mt-1">Mengecek duplikasi...</p>
					{:else if isDuplicate}
						<p class="text-xs text-red-500 mt-1">⚠️ Kata ini sudah ada di database</p>
					{/if}
				</div>

				<div>
					<label for="traits" class="block text-sm font-medium text-gray-700 mb-2">
						Karakteristik <span class="text-red-500">*</span>
						<span
							class="ml-2 text-sm font-normal"
							class:text-green-600={traitsCount >= 20 && traitsCount <= 50}
							class:text-red-500={traitsCount < 20 || traitsCount > 50}
						>
							({traitsCount}/20-50)
						</span>
					</label>
					<textarea
						id="traits"
						bind:value={traitsInput}
						rows="10"
						placeholder="Masukkan karakteristik, dipisahkan dengan koma atau baris baru&#10;Contoh:&#10;hewan, mamalia, herbivora, gurun, pasir, punuk, tinggi, bisa_ditunggangi, air, coklat, afrika, timur_tengah, transportasi, hidup, makhluk, kering, panas, gersang, nomaden, daya_tahan"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 font-mono text-sm"
						required
					></textarea>
					<p class="text-xs text-gray-500 mt-1">
						Minimal 20, maksimal 50 karakteristik. Pisahkan dengan koma atau baris baru.
					</p>
					{#if traitsCount > 0}
						<div class="mt-2 flex flex-wrap gap-2">
							{#each traits.slice(0, 10) as trait (trait)}
								<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
									{trait}
								</span>
							{/each}
							{#if traitsCount > 10}
								<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
									+{traitsCount - 10} lagi
								</span>
							{/if}
						</div>
					{/if}
				</div>

				<div class="flex gap-3">
					<button
						type="submit"
						disabled={loading || !isValid}
						class="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
					>
						{loading ? 'Mengirim...' : 'Submit untuk Review'}
					</button>
					<button
						type="button"
						onclick={() => goto(resolve('/'))}
						class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
					>
						Batal
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
