import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

export function getAdminSupabaseClient() {
  // Check if admin with service role privileges  
  const useServiceRole = localStorage.getItem("useServiceRole") === "true";
  
  if (useServiceRole && process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Using service role client"); // Debug log
    // Return Supabase client with service key
    return createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
    );
  } else {
    console.log("Using regular client"); // Debug log
    // Return regular Supabase client
    return supabase;
  }
}
