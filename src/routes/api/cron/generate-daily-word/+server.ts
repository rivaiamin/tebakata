import { env } from '$env/dynamic/private';
import { error, json, type RequestEvent } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDailyWord, getDateKey, toPublicDailyWord } from '$lib/server/daily-word';

const handler: RequestHandler = async (event) => {
	assertCronAuthorized(event);

	const gameDate = event.url.searchParams.get('date') || getDateKey();
	const force = event.url.searchParams.get('force') === 'true';
	const dailyWord = await getDailyWord(gameDate, { createIfMissing: true, force });

	return json({
		ok: true,
		dailyWord: toPublicDailyWord(dailyWord)
	});
};

export const GET = handler;
export const POST = handler;

function assertCronAuthorized(event: RequestEvent) {
	if (!env.CRON_SECRET) {
		return;
	}

	const authorization = event.request.headers.get('authorization');
	const querySecret = event.url.searchParams.get('secret');

	if (authorization !== `Bearer ${env.CRON_SECRET}` && querySecret !== env.CRON_SECRET) {
		throw error(401, 'Unauthorized');
	}
}
