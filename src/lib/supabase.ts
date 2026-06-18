import { createBrowserClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';

if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
	throw new Error('Missing Supabase environment variables');
}

export const supabase = createBrowserClient(
	env.PUBLIC_SUPABASE_URL,
	env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
