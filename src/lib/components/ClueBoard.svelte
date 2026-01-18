<script lang="ts">
	interface Props {
		traits: string[];
	}
	let { traits }: Props = $props();
</script>

<div class="w-full bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-inner min-h-[120px]">
	<h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Karakteristik yang Ketemu</h3>
	<div class="flex flex-wrap gap-2">
		{#if traits.length === 0}
			<span class="text-slate-400 text-sm italic">Tebak karakteristiknya dulu...</span>
		{:else}
			{#each traits as trait (trait)}
				<span class="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold shadow-sm">
					{trait}
				</span>
			{/each}
		{/if}
	</div>
</div>
