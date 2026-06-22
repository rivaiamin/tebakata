export type DailyPlayStatus = 'won' | 'lost';

export interface DailyPlayRecord {
	game_date: string;
	status: DailyPlayStatus;
	guess_count: number;
	completed_at: string;
}

export function dailyPlayStorageKey(gameDate: string) {
	return `tebakata:daily:${gameDate}`;
}

export function readDailyPlayFromStorage(gameDate: string): DailyPlayRecord | null {
	if (typeof localStorage === 'undefined') return null;

	try {
		const raw = localStorage.getItem(dailyPlayStorageKey(gameDate));
		if (!raw) return null;

		const parsed = JSON.parse(raw) as DailyPlayRecord;
		if (parsed.game_date !== gameDate) return null;
		if (parsed.status !== 'won' && parsed.status !== 'lost') return null;
		if (typeof parsed.guess_count !== 'number') return null;

		return parsed;
	} catch {
		return null;
	}
}

export function writeDailyPlayToStorage(record: DailyPlayRecord) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(dailyPlayStorageKey(record.game_date), JSON.stringify(record));
}

export async function persistDailyPlay(
	gameDate: string,
	status: DailyPlayStatus,
	guessCount: number
) {
	const record: DailyPlayRecord = {
		game_date: gameDate,
		status,
		guess_count: guessCount,
		completed_at: new Date().toISOString()
	};

	writeDailyPlayToStorage(record);

	await fetch('/api/daily-play', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			game_date: gameDate,
			status,
			guess_count: guessCount
		})
	});
}
