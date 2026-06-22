import type { RequestEvent } from '@sveltejs/kit';
import { createUserClient } from '$lib/supabase.server';
import type { DailyPlayStatus } from '$lib/daily-play';

export const DAILY_PLAY_COOKIE = 'tebakata_daily_play';

export interface DailyPlaySnapshot {
	game_date: string;
	status: DailyPlayStatus;
	guess_count: number;
}

function parseDailyPlayCookie(raw: string | undefined, gameDate: string): DailyPlaySnapshot | null {
	if (!raw) return null;

	try {
		const parsed = JSON.parse(raw) as DailyPlaySnapshot;
		if (parsed.game_date !== gameDate) return null;
		if (parsed.status !== 'won' && parsed.status !== 'lost') return null;
		if (typeof parsed.guess_count !== 'number') return null;

		return parsed;
	} catch {
		return null;
	}
}

export function getDailyPlayFromCookie(
	cookies: RequestEvent['cookies'],
	gameDate: string
): DailyPlaySnapshot | null {
	return parseDailyPlayCookie(cookies.get(DAILY_PLAY_COOKIE), gameDate);
}

export function setDailyPlayCookie(
	cookies: RequestEvent['cookies'],
	record: DailyPlaySnapshot
) {
	cookies.set(DAILY_PLAY_COOKIE, JSON.stringify(record), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 48,
		secure: process.env.NODE_ENV === 'production'
	});
}

export async function getDailyPlayForUser(
	event: RequestEvent,
	gameDate: string
): Promise<DailyPlaySnapshot | null> {
	const cookiePlay = getDailyPlayFromCookie(event.cookies, gameDate);
	if (cookiePlay) return cookiePlay;

	const supabase = await createUserClient(event);
	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) return null;

	const { data, error } = await supabase
		.from('daily_plays')
		.select('game_date, status, guess_count')
		.eq('user_id', session.user.id)
		.eq('game_date', gameDate)
		.maybeSingle();

	if (error || !data) return null;

	return {
		game_date: data.game_date,
		status: data.status as DailyPlayStatus,
		guess_count: data.guess_count
	};
}

export async function hasCompletedDailyPlay(event: RequestEvent, gameDate: string) {
	return (await getDailyPlayForUser(event, gameDate)) !== null;
}

export async function recordDailyPlay(
	event: RequestEvent,
	record: DailyPlaySnapshot
): Promise<void> {
	setDailyPlayCookie(event.cookies, record);

	const supabase = await createUserClient(event);
	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) return;

	await supabase.from('daily_plays').upsert(
		{
			user_id: session.user.id,
			game_date: record.game_date,
			status: record.status,
			guess_count: record.guess_count
		},
		{ onConflict: 'user_id,game_date', ignoreDuplicates: true }
	);
}

export function getSubmitRedirectPath(isLoggedIn: boolean) {
	return isLoggedIn ? '/submit' : '/auth?redirect=/submit';
}
