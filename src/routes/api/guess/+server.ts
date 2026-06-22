import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkDailyGuess, getDateKey } from '$lib/server/daily-word';
import { hasCompletedDailyPlay } from '$lib/server/daily-play';

export const POST: RequestHandler = async (event) => {
	const body = await event.request.json().catch(() => null);

	if (!body || typeof body.guess !== 'string') {
		throw error(400, 'Tebakan tidak valid');
	}

	const guess = body.guess.trim();
	if (!guess) {
		throw error(400, 'Tebakan tidak boleh kosong');
	}

	const gameDate = typeof body.game_date === 'string' && body.game_date ? body.game_date : getDateKey();

	if (await hasCompletedDailyPlay(event, gameDate)) {
		throw error(409, 'Kamu sudah main puzzle hari ini');
	}

	const result = await checkDailyGuess(gameDate, guess);

	return json(result);
};
