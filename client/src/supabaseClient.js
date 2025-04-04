import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Add console logs to help debug
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key available:', !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
