import { publicRoutes } from '$lib/site';
import { getSiteOrigin } from '$lib/site-url';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const origin = getSiteOrigin(url.origin);
	const lastmod = new Date().toISOString().slice(0, 10);

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicRoutes
	.map(
		(path) => `  <url>
    <loc>${origin}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${path === '/game' ? 'daily' : 'monthly'}</changefreq>
    <priority>${path === '/game' ? '1.0' : '0.6'}</priority>
  </url>`
	)
	.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
