import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUserClient } from '$lib/supabase.server';

export const GET: RequestHandler = async (event) => {
	const supabase = await createUserClient(event);
	const {
		data: { session }
	} = await supabase.auth.getSession();

	const url = new URL(event.request.url);
	const status = url.searchParams.get('status') || 'approved';
	const userId = url.searchParams.get('user_id');

	let query = supabase.from('submissions').select('*');

	// Filter by status
	if (status !== 'all') {
		query = query.eq('status', status);
	}

	// If user_id provided, filter by creator
	if (userId) {
		query = query.eq('creator_id', userId);
	}

	// If not admin and requesting non-approved, only show own submissions
	if (status !== 'approved' && session) {
		const userRole = session.user.user_metadata?.role;
		if (userRole !== 'admin') {
			query = query.eq('creator_id', session.user.id);
		}
	}

	query = query.order('created_at', { ascending: false });

	const { data, error: dbError } = await query;

	if (dbError) {
		throw error(500, dbError.message);
	}

	return json(data || []);
};

export const POST: RequestHandler = async (event) => {
	const supabase = await createUserClient(event);
	const {
		data: { session }
	} = await supabase.auth.getSession();

	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const body = await event.request.json();
	const { target, traits } = body;

	// Server-side validation
	if (!target || typeof target !== 'string' || target.trim().length < 2) {
		throw error(400, 'Kata target harus minimal 2 karakter');
	}

	if (!Array.isArray(traits) || traits.length < 20 || traits.length > 50) {
		throw error(400, 'Karakteristik harus antara 20-50 item');
	}

	// Check for duplicates in traits
	const uniqueTraits = [...new Set(traits.map((t: string) => t.trim().toLowerCase()))];
	if (uniqueTraits.length !== traits.length) {
		throw error(400, 'Ada karakteristik yang duplikat');
	}

	// Check if target already exists (approved)
	const { data: existing } = await supabase
		.from('submissions')
		.select('id')
		.eq('status', 'approved')
		.ilike('target', target.trim().toLowerCase())
		.limit(1);

	if (existing && existing.length > 0) {
		throw error(400, 'Kata ini sudah ada di database');
	}

	const creatorName =
		session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Anonymous';

	const { data, error: dbError } = await supabase
		.from('submissions')
		.insert({
			target: target.trim().toLowerCase(),
			traits: uniqueTraits,
			creator_id: session.user.id,
			creator_name: creatorName,
			status: 'pending'
		})
		.select()
		.single();

	if (dbError) {
		throw error(500, dbError.message);
	}

	return json(data, { status: 201 });
};
