import { supabase } from '../supabaseClient';

export function getAdminSupabaseClient() {
  // No more service role key - just use the regular client
  // with proper RLS policies instead
  const isAdmin = localStorage.getItem("adminAuth") === "true";
  
  if (isAdmin) {
    console.log("Using admin client with RLS"); 
  } else {
    console.log("Using regular client");
  }
  
  // Always return the regular client
  return supabase;
}
