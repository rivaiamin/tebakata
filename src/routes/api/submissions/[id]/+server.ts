import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUserClient, createServerClient } from '$lib/supabase.server';

export const GET: RequestHandler = async (event) => {
	const supabase = await createUserClient(event);
	const id = event.params.id;

	const { data, error: dbError } = await supabase
		.from('submissions')
		.select('*')
		.eq('id', id)
		.single();

	if (dbError) {
		throw error(404, 'Submission tidak ditemukan');
	}

	return json(data);
};

export const PATCH: RequestHandler = async (event) => {
	const supabase = await createUserClient(event);
	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	// Check if user is admin
	const userRole = session.user.user_metadata?.role;
	if (userRole !== 'admin') {
		throw error(403, 'Hanya admin yang bisa update submission');
	}

	const id = event.params.id;
	const body = await event.request.json();
	const { status } = body;

	if (!['pending', 'approved', 'rejected'].includes(status)) {
		throw error(400, 'Status tidak valid');
	}

	// Use server client for admin operations
	const serverClient = createServerClient();

	const { data, error: dbError } = await serverClient
		.from('submissions')
		.update({
			status,
			reviewed_at: new Date().toISOString(),
			reviewed_by: session.user.id
		})
		.eq('id', id)
		.select()
		.single();

	if (dbError) {
		throw error(500, dbError.message);
	}

	return json(data);
};

export const DELETE: RequestHandler = async (event) => {
	const supabase = await createUserClient(event);
	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	// Check if user is admin
	const userRole = session.user.user_metadata?.role;
	if (userRole !== 'admin') {
		throw error(403, 'Hanya admin yang bisa delete submission');
	}

	const id = event.params.id;
	const serverClient = createServerClient();

	const { error: dbError } = await serverClient.from('submissions').delete().eq('id', id);

	if (dbError) {
		throw error(500, dbError.message);
	}

	return json({ success: true });
};
