<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { user } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	interface Submission {
		id: string;
		target: string;
		traits: string[];
		creator_name: string;
		status: 'pending' | 'approved' | 'rejected';
		created_at: string;
		reviewed_at: string | null;
	}

	let submissions = $state<Submission[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let filter = $state<'pending' | 'approved' | 'rejected' | 'all'>('pending');
	let processingId = $state<string | null>(null);

	onMount(() => {
		// Check if user is admin
		$user.subscribe((u) => {
			if (!u) {
				goto(resolve('/auth'));
				return;
			}
			const role = u.user_metadata?.role;
			if (role !== 'admin') {
				error = 'Hanya admin yang bisa akses halaman ini';
				loading = false;
				return;
			}
			loadSubmissions();
		});
	});

	async function loadSubmissions() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/submissions?status=${filter}`);
			if (!response.ok) throw new Error('Gagal load submissions');
			submissions = await response.json();
		} catch (err: unknown) {
			error = err instanceof Error ? err.message : 'Terjadi kesalahan';
		} finally {
			loading = false;
		}
	}

	async function updateStatus(id: string, status: 'approved' | 'rejected') {
		processingId = id;

		try {
			const response = await fetch(`/api/submissions/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.message || 'Gagal update status');
			}

			// Reload submissions
			await loadSubmissions();
		} catch (err: unknown) {
			alert(err instanceof Error ? err.message : 'Terjadi kesalahan');
		} finally {
			processingId = null;
		}
	}

	async function deleteSubmission(id: string) {
		if (!confirm('Yakin mau hapus submission ini?')) return;

		processingId = id;

		try {
			const response = await fetch(`/api/submissions/${id}`, {
				method: 'DELETE'
			});

			if (!response.ok) throw new Error('Gagal delete submission');

			await loadSubmissions();
		} catch (err: unknown) {
			alert(err instanceof Error ? err.message : 'Terjadi kesalahan');
		} finally {
			processingId = null;
		}
	}

	$effect(() => {
		if ($user) {
			loadSubmissions();
		}
	});
</script>

<div class="min-h-screen bg-slate-100 p-4">
	<div class="max-w-6xl mx-auto">
		<div class="bg-white rounded-xl shadow-lg p-6">
			<div class="flex justify-between items-center mb-6">
				<h1 class="text-2xl font-bold text-gray-800">Admin Panel</h1>
				<button
					onclick={() => goto(resolve('/'))}
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Kembali
				</button>
			</div>

			{#if error && error.includes('Hanya admin')}
				<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					{error}
				</div>
			{:else}
				<div class="mb-4 flex gap-2">
					<button
						onclick={() => {
							filter = 'pending';
							loadSubmissions();
						}}
						class="px-4 py-2 rounded-lg transition-colors"
						class:bg-indigo-600={filter === 'pending'}
						class:text-white={filter === 'pending'}
						class:bg-gray-200={filter !== 'pending'}
						class:text-gray-700={filter !== 'pending'}
					>
						Pending
					</button>
					<button
						onclick={() => {
							filter = 'approved';
							loadSubmissions();
						}}
						class="px-4 py-2 rounded-lg transition-colors"
						class:bg-green-600={filter === 'approved'}
						class:text-white={filter === 'approved'}
						class:bg-gray-200={filter !== 'approved'}
						class:text-gray-700={filter !== 'approved'}
					>
						Approved
					</button>
					<button
						onclick={() => {
							filter = 'rejected';
							loadSubmissions();
						}}
						class="px-4 py-2 rounded-lg transition-colors"
						class:bg-red-600={filter === 'rejected'}
						class:text-white={filter === 'rejected'}
						class:bg-gray-200={filter !== 'rejected'}
						class:text-gray-700={filter !== 'rejected'}
					>
						Rejected
					</button>
					<button
						onclick={() => {
							filter = 'all';
							loadSubmissions();
						}}
						class="px-4 py-2 rounded-lg transition-colors"
						class:bg-gray-600={filter === 'all'}
						class:text-white={filter === 'all'}
						class:bg-gray-200={filter !== 'all'}
						class:text-gray-700={filter !== 'all'}
					>
						All
					</button>
				</div>

				{#if loading}
					<div class="text-center py-8">
						<p class="text-gray-500">Loading...</p>
					</div>
				{:else if submissions.length === 0}
					<div class="text-center py-8">
						<p class="text-gray-500">Tidak ada submission dengan status ini</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each submissions as submission (submission.id)}
							<div
								class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
							>
								<div class="flex justify-between items-start mb-3">
									<div class="flex-1">
										<h3 class="text-lg font-semibold text-gray-800 mb-1">
											{submission.target}
										</h3>
										<p class="text-sm text-gray-600">
											Oleh: {submission.creator_name} •
											{new Date(submission.created_at).toLocaleDateString('id-ID')}
										</p>
										{#if submission.reviewed_at}
											<p class="text-xs text-gray-500">
												Reviewed: {new Date(submission.reviewed_at).toLocaleDateString('id-ID')}
											</p>
										{/if}
									</div>
									<span
										class="px-3 py-1 rounded-full text-xs font-semibold"
										class:bg-yellow-100={submission.status === 'pending'}
										class:text-yellow-800={submission.status === 'pending'}
										class:bg-green-100={submission.status === 'approved'}
										class:text-green-800={submission.status === 'approved'}
										class:bg-red-100={submission.status === 'rejected'}
										class:text-red-800={submission.status === 'rejected'}
									>
										{submission.status}
									</span>
								</div>

								<div class="mb-3">
									<p class="text-sm font-medium text-gray-700 mb-2">
										Karakteristik ({submission.traits.length}):
									</p>
									<div class="flex flex-wrap gap-2">
										{#each submission.traits.slice(0, 20) as trait (trait)}
											<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
												{trait}
											</span>
										{/each}
										{#if submission.traits.length > 20}
											<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
												+{submission.traits.length - 20} lagi
											</span>
										{/if}
									</div>
								</div>

								{#if submission.status === 'pending'}
									<div class="flex gap-2">
										<button
											onclick={() => updateStatus(submission.id, 'approved')}
											disabled={processingId === submission.id}
											class="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											{processingId === submission.id ? 'Processing...' : 'Approve'}
										</button>
										<button
											onclick={() => updateStatus(submission.id, 'rejected')}
											disabled={processingId === submission.id}
											class="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											{processingId === submission.id ? 'Processing...' : 'Reject'}
										</button>
										<button
											onclick={() => deleteSubmission(submission.id)}
											disabled={processingId === submission.id}
											class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										>
											Delete
										</button>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
