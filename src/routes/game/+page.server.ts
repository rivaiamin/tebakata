import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getDailyWordForGame, toPublicDailyWord } from '$lib/server/daily-word';
import {
	getDailyPlayForUser,
	getSubmitRedirectPath
} from '$lib/server/daily-play';
import { createUserClient } from '$lib/supabase.server';

export const load = (async (event) => {
	const dailyWord = await getDailyWordForGame();
	const existingPlay = await getDailyPlayForUser(event, dailyWord.game_date);

	if (existingPlay) {
		const supabase = await createUserClient(event);
		const {
			data: { session }
		} = await supabase.auth.getSession();

		throw redirect(302, getSubmitRedirectPath(!!session));
	}

	return {
		dailyWord: toPublicDailyWord(dailyWord)
	};
}) satisfies PageServerLoad;
