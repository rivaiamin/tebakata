import { env } from '$env/dynamic/private';
import { createServerClient } from '$lib/supabase.server';

const DEFAULT_TIME_ZONE = 'Asia/Jakarta';
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_API_BASE_URL = 'https://api.openai.com/v1';

export interface DailyWord {
	id: string;
	game_date: string;
	target: string;
	traits: string[];
	creator_name: string;
	source: string;
	model: string | null;
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

export function getFallbackDailyWord(gameDate = getDateKey()): DailyWord {
	return {
		id: `fallback-${gameDate}`,
		game_date: gameDate,
		target: 'unta',
		traits: fallbackTraits,
		creator_name: 'System',
		source: 'fallback',
		model: null
	};
}

export async function getDailyWord(gameDate = getDateKey(), options: DailyWordOptions = {}) {
	const supabase = createServerClient();

	if (!options.force) {
		const { data, error } = await supabase
			.from('daily_words')
			.select('id, game_date, target, traits, creator_name, source, model')
			.eq('game_date', gameDate)
			.maybeSingle();

		if (error) {
			console.error('Failed to fetch daily word:', error.message);
		} else if (data) {
			return data as DailyWord;
		}
	}

	if (!options.createIfMissing && !options.force) {
		return getFallbackDailyWord(gameDate);
	}

	const generated = await generateDailyWord(gameDate);
	const { data, error } = await supabase
		.from('daily_words')
		.upsert(
			{
				game_date: gameDate,
				target: generated.target,
				traits: generated.traits,
				creator_name: 'Cursor AI',
				source: 'cursor',
				model: generated.model,
				raw_response: generated.raw_response,
				updated_at: new Date().toISOString()
			},
			{ onConflict: 'game_date' }
		)
		.select('id, game_date, target, traits, creator_name, source, model')
		.single();

	if (error) {
		throw new Error(`Failed to save daily word: ${error.message}`);
	}

	return data as DailyWord;
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
			target: dailyWord.target
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
	const apiKey = env.CURSOR_API_KEY;
	if (!apiKey) {
		throw new Error('Missing CURSOR_API_KEY');
	}

	const model = env.CURSOR_API_MODEL || DEFAULT_MODEL;
	const baseUrl = (env.CURSOR_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
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
