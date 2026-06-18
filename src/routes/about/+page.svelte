<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>About TebaKata</title>
	<meta name="description" content="Tentang TebaKata, game tebak kata harian." />
</svelte:head>

<div class="text-column">
	<h1>About TebaKata</h1>

	<p>
		TebaKata adalah game tebak kata harian. Gunakan tebakan karakteristik untuk membuka
		petunjuk, lalu cari kata target sebelum kesempatan habis.
	</p>

	<p>
		Setiap hari ada satu tantangan untuk semua pemain. Setelah selesai, kamu bisa membagikan
		skor dan waktu penyelesaianmu.
	</p>

	<p>
		<a href={resolve('/game')}>Mainkan TebaKata hari ini</a>
	</p>
</div>
