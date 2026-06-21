<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { user } from '$lib/stores/auth';
	import { onMount } from 'svelte';

	let dropdownOpen = $state(false);
	let dropdownElement: HTMLElement | null = $state(null);

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function closeDropdown() {
		dropdownOpen = false;
	}

	onMount(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
				closeDropdown();
			}
		}

		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<header class="w-full bg-white shadow-sm p-4 sticky top-0 z-10">
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
			<h1 class="logo-text font-bold">
				<a href="{resolve('/game')}">
					TebaKata
				</a>
			</h1>
		</div>
		<nav class="flex items-center">
			{#if $user}
				<div class="dropdown" bind:this={dropdownElement}>
					<button
						class="dropdown-button"
						onclick={toggleDropdown}
						aria-expanded={dropdownOpen}
						aria-haspopup="true"
					>
						Menu
						<svg
							class="dropdown-icon"
							class:rotate={dropdownOpen}
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="6 9 12 15 18 9"></polyline>
						</svg>
					</button>
					{#if dropdownOpen}
						<ul class="dropdown-menu">
							<li class="dropdown-menu-item" aria-current={page.url.pathname.startsWith('/auth') ? 'page' : undefined}>
								<a href={resolve('/auth')} onclick={closeDropdown}>
									{$user.email?.split('@')[0] || 'User'}
								</a>
							</li>
							<li class="dropdown-menu-item" aria-current={page.url.pathname.startsWith('/submit') ? 'page' : undefined}>
								<a href={resolve('/submit')} onclick={closeDropdown}>Submit</a>
							</li>
							{#if $user.user_metadata?.role === 'admin'}
								<li class="dropdown-menu-item" aria-current={page.url.pathname.startsWith('/admin') ? 'page' : undefined}>
									<a href={resolve('/admin')} onclick={closeDropdown}>Admin</a>
								</li>
							{/if}
						</ul>
					{/if}
				</div>
			{:else}
				<a
					href={resolve('/auth')}
					class="login-link"
					aria-current={page.url.pathname.startsWith('/auth') ? 'page' : undefined}
				>
					Login
				</a>
			{/if}
		</nav>
	</div>

</header>

<style>
	.logo-text a {
		color: none;
		background: linear-gradient(to right, var(--color-theme-1), var(--color-theme-2));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		text-decoration: none;
	}

	nav {
		--background: rgba(255, 255, 255, 0.7);
	}

	.dropdown {
		position: relative;
		height: 3em;
	}

	.dropdown-button {
		display: flex;
		height: 100%;
		align-items: center;
		gap: 0.25rem;
		padding: 0 0.75rem;
		color: var(--color-text);
		font-weight: 700;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		background: var(--background);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: color 0.2s linear, background-color 0.2s linear;
		font-family: inherit;
	}

	.dropdown-button:hover {
		color: var(--color-theme-1);
		background: rgba(255, 255, 255, 0.9);
	}

	.dropdown-icon {
		transition: transform 0.2s ease;
	}

	.dropdown-icon.rotate {
		transform: rotate(180deg);
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		min-width: 150px;
		background: white;
		border: 1px solid rgba(0, 0, 0, 0.1);
		border-radius: 4px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		padding: 0.25rem 0;
		margin: 0;
		list-style: none;
		z-index: 1000;
	}

	.dropdown-menu-item {
		position: relative;
	}

	.dropdown-menu-item[aria-current='page']::before {
		--size: 4px;
		content: '';
		width: 0;
		height: 0;
		position: absolute;
		left: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		border: var(--size) solid transparent;
		border-left: var(--size) solid var(--color-theme-1);
	}

	.dropdown-menu-item a {
		display: flex;
		width: 100%;
		align-items: center;
		padding: 0.625rem 1rem;
		padding-left: calc(1rem + 12px);
		color: var(--color-text);
		font-weight: 700;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		text-decoration: none;
		transition: background-color 0.2s linear, color 0.2s linear;
	}

	.dropdown-menu-item a:hover {
		background-color: rgba(0, 0, 0, 0.05);
		color: var(--color-theme-1);
	}

	.login-link {
		display: flex;
		height: 3em;
		align-items: center;
		padding: 0 0.75rem;
		color: var(--color-text);
		font-weight: 700;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		background: var(--background);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: color 0.2s linear, background-color 0.2s linear;
		text-decoration: none;
	}

	.login-link:hover {
		color: var(--color-theme-1);
		background: rgba(255, 255, 255, 0.9);
	}
</style>
