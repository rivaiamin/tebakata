import { createClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestEvent } from '@sveltejs/kit';

// Client for server-side operations (with service role key for admin operations)
export function createServerClient() {
	if (!publicEnv.PUBLIC_SUPABASE_URL) {
		throw new Error('Missing PUBLIC_SUPABASE_URL');
	}

	// Use service role key if available (for admin operations), otherwise use publishable key
	const key = privateEnv.SUPABASE_SERVICE_ROLE_KEY || publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!key) {
		throw new Error('Missing Supabase key');
	}

	return createClient(publicEnv.PUBLIC_SUPABASE_URL, key);
}

// Client for user-specific operations (uses user's session)
export async function createUserClient(event: RequestEvent) {
	const { createServerClient } = await import('@supabase/ssr');

	if (!publicEnv.PUBLIC_SUPABASE_URL || !publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
		throw new Error('Missing Supabase environment variables');
	}

	return createServerClient(publicEnv.PUBLIC_SUPABASE_URL, publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
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
