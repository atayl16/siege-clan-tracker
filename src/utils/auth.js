// In your auth.js file
import { supabase } from "../supabaseClient";

export async function isAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  // Query your users table to check admin status
  const { data, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('supabase_auth_id', user.id)
    .single();
    
  if (error || !data) return false;
  return data.is_admin === true;
}
