import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

// Get the same environment variables used in the main client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Log key availability for debugging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log("Service role key available:", supabaseServiceRoleKey ? "✓" : "❌");
}

export function getAdminSupabaseClient() {
  // Check if admin with service role privileges  
  const useServiceRole = localStorage.getItem("useServiceRole") === "true";
  
  if (useServiceRole && supabaseServiceRoleKey) {
    console.log("Using service role client"); // Debug log
    // Return Supabase client with service key
    return createClient(supabaseUrl, supabaseServiceRoleKey);
  } else {
    // Log why we're not using service role 
    if (useServiceRole && !supabaseServiceRoleKey) {
      console.warn("Service role requested but key not available in environment");
    }
    console.log("Using regular client"); // Debug log
    // Return regular Supabase client
    return supabase;
  }
}
