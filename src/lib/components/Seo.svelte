<script lang="ts">
	import { page } from '$app/state';
	import { seoForPath, site } from '$lib/site';
	import { getSiteOrigin, serializeJsonLd } from '$lib/site-url';

	let {
		title,
		description,
		path,
		noindex,
		ogType,
		jsonLd
	}: {
		title?: string;
		description?: string;
		path?: string;
		noindex?: boolean;
		ogType?: string;
		jsonLd?: Record<string, unknown> | Record<string, unknown>[];
	} = $props();

	const defaults = $derived(seoForPath(page.url.pathname));

	const pageTitle = $derived(title ?? defaults.title);
	const pageDescription = $derived(description ?? defaults.description);
	const pageNoindex = $derived(noindex ?? defaults.noindex);
	const pageOgType = $derived(ogType ?? defaults.ogType);
	const canonicalPath = $derived(path ?? page.url.pathname);
	const origin = $derived(getSiteOrigin(page.url.origin));
	const canonicalUrl = $derived(`${origin}${canonicalPath}`);
	const ogImageUrl = $derived(`${origin}/og-image.svg`);
	const jsonLdPayload = $derived(
		jsonLd ??
			({
				'@context': 'https://schema.org',
				'@type': 'WebApplication',
				name: site.name,
				description: site.description,
				url: `${origin}/game`,
				applicationCategory: 'GameApplication',
				operatingSystem: 'Any',
				inLanguage: 'id',
				offers: {
					'@type': 'Offer',
					price: '0',
					priceCurrency: 'IDR'
				}
			} satisfies Record<string, unknown>)
	);
	const jsonLdScript = $derived(serializeJsonLd(jsonLdPayload));
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<link rel="canonical" href={canonicalUrl} />

	{#if pageNoindex}
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<meta name="robots" content="index, follow" />
	{/if}

	<meta property="og:site_name" content={site.name} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:type" content={pageOgType} />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:locale" content={site.locale} />
	<meta property="og:image" content={ogImageUrl} />
	<meta property="og:image:alt" content="{site.name} — {pageDescription}" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={pageDescription} />
	<meta name="twitter:image" content={ogImageUrl} />
	<meta name="twitter:image:alt" content="{site.name} — {pageDescription}" />

	{@html jsonLdScript}
</svelte:head>
