import { env } from '$env/dynamic/private';
import { createServerClient } from '$lib/supabase.server';

const DEFAULT_TIME_ZONE = 'Asia/Jakarta';
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_API_BASE_URL = 'https://api.openai.com/v1';
const DAILY_WORD_SELECT = [
	'id',
	'game_date',
	'target',
	'traits',
	'creator_name',
	'source',
	'model',
	'wiki_title',
	'wiki_extract',
	'wiki_url',
	'image_url',
	'image_alt',
	'image_credit',
	'image_credit_url',
	'image_source'
].join(', ');

export interface DailyWord {
	id: string;
	game_date: string;
	target: string;
	traits: string[];
	creator_name: string;
	source: string;
	model: string | null;
	wiki_title: string | null;
	wiki_extract: string | null;
	wiki_url: string | null;
	image_url: string | null;
	image_alt: string | null;
	image_credit: string | null;
	image_credit_url: string | null;
	image_source: string | null;
}

interface GeneratedDailyWord {
	target: string;
	traits: string[];
	model: string;
	raw_response: unknown;
}

interface DailyWordOptions {
	createIfMissing?: boolean;
	force?: boolean;
}

interface DailyWordMedia {
	wiki_title: string | null;
	wiki_extract: string | null;
	wiki_url: string | null;
	image_url: string | null;
	image_alt: string | null;
	image_credit: string | null;
	image_credit_url: string | null;
	image_source: string | null;
}

const fallbackTraits = [
	'hewan',
	'mamalia',
	'herbivora',
	'gurun',
	'pasir',
	'punuk',
	'tinggi',
	'bisa_ditunggangi',
	'air',
	'coklat',
	'afrika',
	'timur_tengah',
	'transportasi',
	'hidup',
	'makhluk',
	'kering',
	'panas',
	'gersang',
	'nomaden',
	'daya_tahan',
	'punggung',
	'binatang',
	'berjalan',
	'padang_pasir',
	'sahara'
];

export function getDailyWordTimeZone() {
	return env.DAILY_WORD_TIME_ZONE || DEFAULT_TIME_ZONE;
}

export function getDateKey(date = new Date(), timeZone = getDailyWordTimeZone()) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(date);

	const year = parts.find((part) => part.type === 'year')?.value;
	const month = parts.find((part) => part.type === 'month')?.value;
	const day = parts.find((part) => part.type === 'day')?.value;

	if (!year || !month || !day) {
		throw new Error(`Unable to format date for time zone ${timeZone}`);
	}

	return `${year}-${month}-${day}`;
}

export function normalizeGuess(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function toPublicDailyWord(dailyWord: DailyWord) {
	return {
		id: dailyWord.id,
		game_date: dailyWord.game_date,
		creator_name: dailyWord.creator_name,
		source: dailyWord.source
	};
}

export function toDailyWordReveal(dailyWord: DailyWord) {
	return {
		wiki:
			dailyWord.wiki_title || dailyWord.wiki_extract || dailyWord.wiki_url
				? {
						title: dailyWord.wiki_title,
						extract: dailyWord.wiki_extract,
						url: dailyWord.wiki_url
					}
				: null,
		image: dailyWord.image_url
			? {
					url: dailyWord.image_url,
					alt: dailyWord.image_alt || `Gambar ${dailyWord.target.replace(/_/g, ' ')}`,
					credit: dailyWord.image_credit,
					credit_url: dailyWord.image_credit_url,
					source: dailyWord.image_source
				}
			: null
	};
}

export function getFallbackDailyWord(gameDate = getDateKey()): DailyWord {
	return {
		id: `fallback-${gameDate}`,
		game_date: gameDate,
		target: 'unta',
		traits: fallbackTraits,
		creator_name: 'System',
		source: 'fallback',
		model: null,
		wiki_title: 'Unta',
		wiki_extract:
			'Unta adalah hewan mamalia berkuku genap yang dikenal dengan punuknya dan kemampuannya bertahan di lingkungan gurun.',
		wiki_url: 'https://id.wikipedia.org/wiki/Unta',
		image_url: null,
		image_alt: null,
		image_credit: null,
		image_credit_url: null,
		image_source: null
	};
}

export async function getDailyWord(gameDate = getDateKey(), options: DailyWordOptions = {}) {
	const supabase = createServerClient();

	if (!options.force) {
		const { data, error } = await supabase
			.from('daily_words')
			.select(DAILY_WORD_SELECT)
			.eq('game_date', gameDate)
			.maybeSingle();

		if (error) {
			console.error('Failed to fetch daily word:', error.message);
		} else if (data) {
			return data as unknown as DailyWord;
		}
	}

	if (!options.createIfMissing && !options.force) {
		return getFallbackDailyWord(gameDate);
	}

	const generated = await generateDailyWord(gameDate);
	const media = await fetchDailyWordMedia(generated.target);
	const { data, error } = await supabase
		.from('daily_words')
		.upsert(
			{
				game_date: gameDate,
				target: generated.target,
				traits: generated.traits,
				creator_name: 'AI',
				source: 'llm',
				model: generated.model,
				raw_response: generated.raw_response,
				...media,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'game_date' }
		)
		.select(DAILY_WORD_SELECT)
		.single();

	if (error) {
		throw new Error(`Failed to save daily word: ${error.message}`);
	}

	return data as unknown as DailyWord;
}

export async function getDailyWordForGame(gameDate = getDateKey()) {
	try {
		return await getDailyWord(gameDate, { createIfMissing: true });
	} catch (error) {
		console.error('Falling back to built-in daily word:', error);
		return getFallbackDailyWord(gameDate);
	}
}

export async function checkDailyGuess(gameDate: string, guess: string) {
	const dailyWord = await getDailyWord(gameDate);
	const normalizedGuess = normalizeGuess(guess);
	const normalizedTarget = normalizeGuess(dailyWord.target);

	if (normalizedGuess === normalizedTarget) {
		return {
			result: 'target' as const,
			target: dailyWord.target,
			reveal: toDailyWordReveal(dailyWord)
		};
	}

	const matchingTrait = dailyWord.traits.find((trait) => normalizeGuess(trait) === normalizedGuess);
	if (matchingTrait) {
		return {
			result: 'trait' as const,
			trait: matchingTrait
		};
	}

	return {
		result: 'miss' as const
	};
}

async function generateDailyWord(gameDate: string): Promise<GeneratedDailyWord> {
	const apiKey = env.LLM_API_KEY;
	if (!apiKey) {
		throw new Error('Missing LLM_API_KEY');
	}

	const model = env.LLM_API_MODEL || DEFAULT_MODEL;
	const baseUrl = (env.LLM_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
	const response = await fetch(`${baseUrl}/chat/completions`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model,
			temperature: 0.9,
			response_format: { type: 'json_object' },
			messages: [
				{
					role: 'system',
					content:
						'You generate one fair daily word puzzle for an Indonesian guessing game. Return only valid JSON.'
				},
				{
					role: 'user',
					content: [
						`Generate the puzzle for date ${gameDate}.`,
						'Return JSON with exactly these fields: "target" and "traits".',
						'The target must be one Indonesian word or a short phrase represented with underscores.',
						'The traits array must contain 30-50 unique Indonesian single words or underscore_joined phrases.',
						'Traits should include categories, synonyms, physical properties, uses, places, and related concepts.',
						'Do not include the target itself in traits.'
					].join(' ')
				}
			]
		})
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Daily word API request failed (${response.status}): ${body}`);
	}

	const raw = await response.json();
	const content = raw?.choices?.[0]?.message?.content;
	if (typeof content !== 'string') {
		throw new Error('Daily word API returned an invalid response shape');
	}

	const parsed = parseJsonContent(content);
	const target = normalizeGuess(assertString(parsed.target, 'target'));
	const traits = normalizeTraits(assertStringArray(parsed.traits, 'traits'), target);

	return {
		target,
		traits,
		model,
		raw_response: raw
	};
}

function parseJsonContent(content: string) {
	try {
		return JSON.parse(content);
	} catch {
		const match = content.match(/\{[\s\S]*\}/);
		if (!match) {
			throw new Error('Daily word API did not return JSON');
		}

		return JSON.parse(match[0]);
	}
}

function assertString(value: unknown, field: string) {
	if (typeof value !== 'string' || value.trim().length < 2) {
		throw new Error(`Daily word API returned an invalid ${field}`);
	}

	return value;
}

function assertStringArray(value: unknown, field: string) {
	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
		throw new Error(`Daily word API returned an invalid ${field}`);
	}

	return value as string[];
}

function normalizeTraits(traits: string[], target: string) {
	const normalized = [
		...new Set(
			traits
				.map((trait) => normalizeGuess(trait))
				.filter((trait) => trait.length > 1 && trait !== target)
		)
	];

	if (normalized.length < 20) {
		throw new Error(`Daily word API returned only ${normalized.length} valid traits`);
	}

	return normalized.slice(0, 50);
}

async function fetchDailyWordMedia(target: string): Promise<DailyWordMedia> {
	const [wiki, image] = await Promise.all([
		fetchWikipediaSummary(target).catch((error) => {
			console.error('Failed to fetch Wikipedia summary:', error);
			return null;
		}),
		fetchStockImage(target).catch((error) => {
			console.error('Failed to fetch stock image:', error);
			return null;
		})
	]);

	return {
		wiki_title: wiki?.title ?? null,
		wiki_extract: wiki?.extract ?? null,
		wiki_url: wiki?.url ?? null,
		image_url: image?.url ?? null,
		image_alt: image?.alt ?? null,
		image_credit: image?.credit ?? null,
		image_credit_url: image?.creditUrl ?? null,
		image_source: image?.source ?? null
	};
}

async function fetchWikipediaSummary(target: string) {
	const query = target.replace(/_/g, ' ');

	for (const language of ['id', 'en']) {
		const title = await searchWikipediaTitle(language, query);
		if (!title) continue;

		const response = await fetch(
			`https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
			{
				headers: {
					accept: 'application/json'
				}
			}
		);

		if (!response.ok) continue;

		const summary = (await response.json()) as {
			title?: unknown;
			extract?: unknown;
			content_urls?: { desktop?: { page?: unknown } };
		};
		const extract = typeof summary.extract === 'string' ? summary.extract : null;
		const url =
			typeof summary.content_urls?.desktop?.page === 'string'
				? summary.content_urls.desktop.page
				: null;

		if (extract || url) {
			return {
				title: typeof summary.title === 'string' ? summary.title : title,
				extract,
				url
			};
		}
	}

	return null;
}

async function searchWikipediaTitle(language: string, query: string) {
	const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
	url.searchParams.set('action', 'query');
	url.searchParams.set('list', 'search');
	url.searchParams.set('srsearch', query);
	url.searchParams.set('format', 'json');
	url.searchParams.set('origin', '*');
	url.searchParams.set('srlimit', '1');

	const response = await fetch(url);
	if (!response.ok) return null;

	const data = (await response.json()) as {
		query?: { search?: Array<{ title?: unknown }> };
	};
	const title = data.query?.search?.[0]?.title;

	return typeof title === 'string' ? title : null;
}

async function fetchStockImage(target: string) {
	const query = target.replace(/_/g, ' ');

	if (env.UNSPLASH_ACCESS_KEY) {
		return fetchUnsplashImage(query, env.UNSPLASH_ACCESS_KEY);
	}

	if (env.PEXELS_API_KEY) {
		return fetchPexelsImage(query, env.PEXELS_API_KEY);
	}

	return null;
}

async function fetchUnsplashImage(query: string, accessKey: string) {
	const url = new URL('https://api.unsplash.com/search/photos');
	url.searchParams.set('query', query);
	url.searchParams.set('per_page', '1');
	url.searchParams.set('orientation', 'landscape');
	url.searchParams.set('content_filter', 'high');

	const response = await fetch(url, {
		headers: {
			Authorization: `Client-ID ${accessKey}`,
			'Accept-Version': 'v1'
		}
	});

	if (!response.ok) return null;

	const data = (await response.json()) as {
		results?: Array<{
			alt_description?: unknown;
			description?: unknown;
			links?: { html?: unknown };
			urls?: { regular?: unknown };
			user?: { name?: unknown; links?: { html?: unknown } };
		}>;
	};
	const photo = data.results?.[0];
	const imageUrl = photo?.urls?.regular;

	if (typeof imageUrl !== 'string') return null;

	return {
		url: imageUrl,
		alt:
			typeof photo?.alt_description === 'string'
				? photo.alt_description
				: typeof photo?.description === 'string'
					? photo.description
					: query,
		credit: typeof photo?.user?.name === 'string' ? photo.user.name : 'Unsplash',
		creditUrl:
			typeof photo?.user?.links?.html === 'string'
				? photo.user.links.html
				: typeof photo?.links?.html === 'string'
					? photo.links.html
					: null,
		source: 'Unsplash'
	};
}

async function fetchPexelsImage(query: string, apiKey: string) {
	const url = new URL('https://api.pexels.com/v1/search');
	url.searchParams.set('query', query);
	url.searchParams.set('per_page', '1');
	url.searchParams.set('orientation', 'landscape');

	const response = await fetch(url, {
		headers: {
			Authorization: apiKey
		}
	});

	if (!response.ok) return null;

	const data = (await response.json()) as {
		photos?: Array<{
			alt?: unknown;
			photographer?: unknown;
			photographer_url?: unknown;
			src?: { large2x?: unknown; large?: unknown; original?: unknown };
			url?: unknown;
		}>;
	};
	const photo = data.photos?.[0];
	const imageUrl = photo?.src?.large2x ?? photo?.src?.large ?? photo?.src?.original;

	if (typeof imageUrl !== 'string') return null;

	return {
		url: imageUrl,
		alt: typeof photo?.alt === 'string' && photo.alt ? photo.alt : query,
		credit: typeof photo?.photographer === 'string' ? photo.photographer : 'Pexels',
		creditUrl:
			typeof photo?.photographer_url === 'string'
				? photo.photographer_url
				: typeof photo?.url === 'string'
					? photo.url
					: null,
		source: 'Pexels'
	};
}
