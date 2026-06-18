import { createBrowserClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';

const supabaseUrl = env.PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'missing-supabase-publishable-key';

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
