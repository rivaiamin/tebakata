export const site = {
	name: 'TebaKata',
	title: 'TebaKata — Game Tebak Kata Harian',
	description:
		'Tebak kata harian ala 20 pertanyaan. Kirim karakteristik untuk membuka petunjuk, lalu temukan kata target sebelum 20 tebakan habis.',
	locale: 'id_ID',
	themeColor: '#4f46e5',
	twitterHandle: '@TebaKata'
} as const;

export type SeoMeta = {
	title?: string;
	description?: string;
	noindex?: boolean;
	ogType?: string;
};

export const pageSeo: Record<string, SeoMeta> = {
	'/game': {
		title: site.title,
		description: site.description,
		ogType: 'website'
	},
	'/about': {
		title: 'Tentang TebaKata',
		description:
			'Pelajari cara main TebaKata: game tebak kata harian Indonesia dengan petunjuk karakteristik dan satu tantangan untuk semua pemain.'
	},
	'/submit': {
		title: 'Submit Kata',
		description: 'Kirim ide kata dan karakteristikmu untuk dipakai di puzzle TebaKata mendatang.',
		noindex: true
	},
	'/auth': {
		title: 'Masuk / Daftar',
		description: 'Masuk atau buat akun TebaKata untuk submit kata dan mengikuti tantangan harian.',
		noindex: true
	},
	'/admin': {
		title: 'Admin Panel',
		noindex: true
	}
};

export function seoForPath(pathname: string) {
	const page = pageSeo[pathname] ?? {};

	return {
		title: page.title ?? site.title,
		description: page.description ?? site.description,
		noindex: page.noindex ?? false,
		ogType: page.ogType ?? 'website'
	};
}

export const publicRoutes = ['/game', '/about'] as const;
