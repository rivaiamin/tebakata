import { redirect, error } from '@sveltejs/kit';
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

	// Check if user is admin
	const userRole = session.user.user_metadata?.role;
	if (userRole !== 'admin') {
		throw error(403, 'Hanya admin yang bisa akses halaman ini');
	}

	return {
		user: session.user
	};
}) satisfies PageServerLoad;
