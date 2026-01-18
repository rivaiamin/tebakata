import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createUserClient } from '$lib/supabase.server';

export const load = (async (event) => {
	const supabase = await createUserClient(event);
	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		throw redirect(302, '/auth');
	}

	return {
		user: session.user
	};
}) satisfies PageServerLoad;
