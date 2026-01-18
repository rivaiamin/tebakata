<script lang="ts">
	import { supabase } from '../supabase';
	import { user } from '../stores/auth';
	import { goto } from '$app/navigation';

	let isLogin = $state(true);
	let email = $state('');
	let password = $state('');
	let username = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	async function handleAuth() {
		loading = true;
		error = null;
		success = null;

		try {
			if (isLogin) {
				const { data, error: authError } = await supabase.auth.signInWithPassword({
					email,
					password
				});

				if (authError) throw authError;
				if (data.user) {
					success = 'Login berhasil!';
					setTimeout(() => goto('/'), 1000);
				}
			} else {
				const { data, error: authError } = await supabase.auth.signUp({
					email,
					password,
					options: {
						data: {
							username: username || email.split('@')[0]
						}
					}
				});

				if (authError) throw authError;
				if (data.user) {
					success = 'Registrasi berhasil! Silakan cek email untuk verifikasi.';
					setTimeout(() => {
						isLogin = true;
						username = '';
					}, 2000);
				}
			}
		} catch (err: any) {
			error = err.message || 'Terjadi kesalahan';
		} finally {
			loading = false;
		}
	}

	async function handleSignOut() {
		await supabase.auth.signOut();
		goto('/');
	}
</script>

<div class="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
	{#if $user}
		<div class="text-center space-y-4">
			<p class="text-lg font-semibold">Halo, {$user.email}!</p>
			<button
				onclick={handleSignOut}
				class="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors"
			>
				Logout
			</button>
		</div>
	{:else}
		<div class="space-y-4">
			<div class="flex gap-2 border-b">
				<button
					onclick={() => {
						isLogin = true;
						error = null;
					}}
					class="flex-1 py-2 font-semibold transition-colors"
					class:text-indigo-600={isLogin}
					class:border-b-2={isLogin}
					class:border-indigo-600={isLogin}
					class:text-gray-400={!isLogin}
				>
					Login
				</button>
				<button
					onclick={() => {
						isLogin = false;
						error = null;
					}}
					class="flex-1 py-2 font-semibold transition-colors"
					class:text-indigo-600={!isLogin}
					class:border-b-2={!isLogin}
					class:border-indigo-600={!isLogin}
					class:text-gray-400={isLogin}
				>
					Register
				</button>
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

			<form onsubmit={(e) => { e.preventDefault(); handleAuth(); }} class="space-y-4">
				{#if !isLogin}
					<div>
						<label for="username" class="block text-sm font-medium text-gray-700 mb-1">
							Username
						</label>
						<input
							id="username"
							type="text"
							bind:value={username}
							placeholder="Username (opsional)"
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
						/>
					</div>
				{/if}

				<div>
					<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
						Email
					</label>
					<input
						id="email"
						type="email"
						bind:value={email}
						required
						placeholder="email@example.com"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
					/>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700 mb-1">
						Password
					</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						required
						placeholder="Minimal 6 karakter"
						minlength="6"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
					/>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					{loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
				</button>
			</form>
		</div>
	{/if}
</div>
