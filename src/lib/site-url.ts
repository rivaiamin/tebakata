import { env as publicEnv } from '$env/dynamic/public';

export function getSiteOrigin(fallback: string) {
	const configured = publicEnv.PUBLIC_SITE_URL?.replace(/\/$/, '');
	return configured || fallback;
}

export function serializeJsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
	const safeJson = JSON.stringify(data).replace(/</g, '\\u003c');
	return `<script type="application/ld+json">${safeJson}<` + `/script>`;
}
