import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("Using Supabase URL:", supabaseUrl ? "✓ Set" : "❌ Missing");
console.log(
  "Using Anon Key ending with:",
  supabaseAnonKey ? `...${supabaseAnonKey.slice(-4)}` : "❌ Missing"
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
