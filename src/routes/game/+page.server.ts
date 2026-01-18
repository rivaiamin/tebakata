import type { PageServerLoad } from './$types';
import { createServerClient } from '$lib/supabase.server';

async function getRandomSubmission() {
	const supabase = createServerClient();

	// Get count of approved submissions
	const { count, error: countError } = await supabase
		.from('submissions')
		.select('*', { count: 'exact', head: true })
		.eq('status', 'approved');

	if (countError || !count || count === 0) {
		// Fallback to mock data if no submissions
		return {
			target: 'Unta',
			traits: [
				'hewan', 'mamalia', 'herbivora', 'gurun', 'pasir', 'punuk',
				'tinggi', 'bisa_ditunggangi', 'air', 'coklat', 'afrika',
				'timur_tengah', 'transportasi', 'hidup', 'makhluk', 'kering',
				'panas', 'gersang', 'nomaden', 'daya_tahan', 'punggung', 'binatang',
				'berjalan', 'padang_pasir', 'sahara'
			],
			creator_name: 'System'
		};
	}

	// Get random submission
	const randomOffset = Math.floor(Math.random() * count);
	const { data, error: fetchError } = await supabase
		.from('submissions')
		.select('target, traits, creator_name')
		.eq('status', 'approved')
		.range(randomOffset, randomOffset)
		.single();

	if (fetchError || !data) {
		// Fallback
		return {
			target: 'Unta',
			traits: [
				'hewan', 'mamalia', 'herbivora', 'gurun', 'pasir', 'punuk',
				'tinggi', 'bisa_ditunggangi', 'air', 'coklat', 'afrika',
				'timur_tengah', 'transportasi', 'hidup', 'makhluk', 'kering',
				'panas', 'gersang', 'nomaden', 'daya_tahan', 'punggung', 'binatang',
				'berjalan', 'padang_pasir', 'sahara'
			],
			creator_name: 'System'
		};
	}

	return data;
}

export const load = (async () => {
	try {
		const gameData = await getRandomSubmission();

		return {
			target: gameData.target,
			traits: gameData.traits,
			creator_name: gameData.creator_name || 'Anonymous'
		};
	} catch {
		// Fallback to mock data on error
		return {
			target: 'Unta',
			traits: [
				'hewan', 'mamalia', 'herbivora', 'gurun', 'pasir', 'punuk',
				'tinggi', 'bisa_ditunggangi', 'air', 'coklat', 'afrika',
				'timur_tengah', 'transportasi', 'hidup', 'makhluk', 'kering',
				'panas', 'gersang', 'nomaden', 'daya_tahan', 'punggung', 'binatang',
				'berjalan', 'padang_pasir', 'sahara'
			],
			creator_name: 'System'
		};
	}
}) satisfies PageServerLoad;
