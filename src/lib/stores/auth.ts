import { writable } from 'svelte/store';
import { supabase } from '../supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthUser extends User {
	user_metadata?: {
		username?: string;
		role?: string;
	};
}

export const user = writable<AuthUser | null>(null);
export const loading = writable<boolean>(true);

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
	user.set(session?.user ?? null);
	loading.set(false);
});

// Listen for auth changes
supabase.auth.onAuthStateChange((_event, session) => {
	user.set(session?.user ?? null);
	loading.set(false);
});
