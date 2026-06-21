import { env as publicEnv } from '$env/dynamic/public';

export function getSiteOrigin(fallback: string) {
	const configured = publicEnv.PUBLIC_SITE_URL?.replace(/\/$/, '');
	return configured || fallback;
}
