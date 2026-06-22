import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDateKey } from '$lib/server/daily-word';
import { getDailyPlayForUser, recordDailyPlay } from '$lib/server/daily-play';
import type { DailyPlayStatus } from '$lib/daily-play';

export const POST: RequestHandler = async (event) => {
	const body = await event.request.json().catch(() => null);

	if (!body || typeof body.game_date !== 'string' || typeof body.guess_count !== 'number') {
		throw error(400, 'Data permainan tidak valid');
	}

	const status = body.status;
	if (status !== 'won' && status !== 'lost') {
		throw error(400, 'Status permainan tidak valid');
	}

	const gameDate = body.game_date || getDateKey();
	const guessCount = body.guess_count;

	if (!Number.isInteger(guessCount) || guessCount < 1 || guessCount > 20) {
		throw error(400, 'Jumlah tebakan tidak valid');
	}

	const existing = await getDailyPlayForUser(event, gameDate);
	if (existing) {
		return json({ ok: true, already_recorded: true, play: existing });
	}

	const record = {
		game_date: gameDate,
		status: status as DailyPlayStatus,
		guess_count: guessCount
	};

	await recordDailyPlay(event, record);

	return json({ ok: true, play: record });
};
