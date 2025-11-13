import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
// In Vite, use import.meta.env instead of process.env for browser code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log("Using Supabase URL:", supabaseUrl ? "✓ Set" : "❌ Missing");
console.log(
  "Using Anon Key ending with:",
  supabaseAnonKey ? `...${supabaseAnonKey.slice(-4)}` : "❌ Missing"
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase configuration missing! Check your .env file.");
  console.error("Required: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  }
});

// When the app starts, try to recover session
export const initializeAuth = async () => {
  // Try to get session from URL if present
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Error recovering session:", error);
    return null;
  }

  return data?.session;
};
