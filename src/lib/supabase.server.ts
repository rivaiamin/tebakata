import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import type { RequestEvent } from '@sveltejs/kit';

// Client for server-side operations (with service role key for admin operations)
export function createServerClient() {
	if (!PUBLIC_SUPABASE_URL) {
		throw new Error('Missing PUBLIC_SUPABASE_URL');
	}

	// Use service role key if available (for admin operations), otherwise use publishable key
	const key = SUPABASE_SERVICE_ROLE_KEY || PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!key) {
		throw new Error('Missing Supabase key');
	}

	return createClient(PUBLIC_SUPABASE_URL, key);
}

// Client for user-specific operations (uses user's session)
export async function createUserClient(event: RequestEvent) {
	const { createServerClient } = await import('@supabase/ssr');

	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			get: (key) => event.cookies.get(key),
			set: (key, value, options) => {
				event.cookies.set(key, value, { ...options, path: '/' });
			},
			remove: (key, options) => {
				event.cookies.delete(key, { ...options, path: '/' });
			}
		}
	});
}
