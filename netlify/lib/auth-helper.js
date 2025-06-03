// Helper function to verify a user based on UUID
export async function verifyUser(supabase, userId) {
  if (!userId) return null;
  
  // Check if user exists and return user data
  const { data, error } = await supabase
    .from("users")
    .select("id, username, is_admin")
    .eq("id", userId)
    .single();
    
  if (error || !data) return null;
  return data;
}

// Check if user can manage a resource (owner or admin)
export async function canManageResource(supabase, userId, table, resourceId, creatorField = "creator_id") {
  if (!userId || !resourceId) return false;
  
  // First check if user is admin
  const { data: userData } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", userId)
    .single();
    
  if (userData?.is_admin) return true;
  
  // Then check if user is the creator
  const { data: resource } = await supabase
    .from(table)
    .select(creatorField)
    .eq("id", resourceId)
    .single();
    
  return resource && resource[creatorField] === userId;
}

// Add a default export handler function for Netlify Edge Functions
export default async function handler(req, context) {
  return new Response(
    JSON.stringify({
      message: "This is a helper module, not meant to be called directly."
    }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" }
    }
  );
}
