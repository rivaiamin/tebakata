import type { PageServerLoad } from './$types';
import { getDailyWordForGame, toPublicDailyWord } from '$lib/server/daily-word';

export const load = (async () => {
	const dailyWord = await getDailyWordForGame();

	return {
		dailyWord: toPublicDailyWord(dailyWord)
	};
}) satisfies PageServerLoad;
