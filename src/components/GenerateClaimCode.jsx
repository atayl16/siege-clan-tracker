import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./GenerateClaimCode.css";

export default function GenerateClaimCode() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [selectedMember, setSelectedMember] = useState("");
  const [expiryDays, setExpiryDays] = useState(30);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch available members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        
        // Get all members
        const { data: allMembers, error: membersError } = await supabase
          .from('members')
          .select('wom_id, name')
          .order('name');
        
        if (membersError) throw membersError;
        
        // Get already claimed players
        const { data: claimedPlayers, error: claimsError } = await supabase
          .from('player_claims')
          .select('wom_id');
          
        if (claimsError) throw claimsError;
        
        // Filter out already claimed players
        const claimedIds = new Set(claimedPlayers.map(p => p.wom_id));
        const availableMembers = allMembers.filter(m => !claimedIds.has(m.wom_id));
        
        setMembers(availableMembers);
      } catch (err) {
        console.error("Error fetching members:", err);
        setError("Failed to load members");
      } finally {
        setLoadingMembers(false);
      }
    };
    
    fetchMembers();
  }, []);

  // Generate a random code
  const generateRandomCode = () => {
    // Create a combination of letters and numbers
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    
    // Create an 8-character code
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMember) {
      setError("Please select a player");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    setGeneratedCode(null);
    
    try {
      // Find the selected member's full data to ensure we use the correct wom_id
      const selectedMemberObj = members.find(m => m.wom_id.toString() === selectedMember.toString());
      
      if (!selectedMemberObj) {
        throw new Error("Selected member not found");
      }
      
      const code = generateRandomCode();
      let expiresAt = null;
      
      if (expiryDays > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays));
        expiresAt = expiresAt.toISOString();
      }
      
      // Ensure wom_id is correctly handled as number if needed
      const womId = typeof selectedMemberObj.wom_id === 'string' 
        ? parseInt(selectedMemberObj.wom_id, 10) 
        : selectedMemberObj.wom_id;
      
      const { error } = await supabase
        .from('claim_codes')
        .insert([{
          code,
          wom_id: womId,
          expires_at: expiresAt
        }])
        .select();
        
      if (error) throw error;
      
      setGeneratedCode(code);
      setSuccess(`Claim code generated successfully for ${selectedMemberObj.name}!`);
      
    } catch (err) {
      console.error("Error generating claim code:", err);
      setError(`Failed to generate claim code: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="generate-code-container">
      <h2>Generate Player Claim Code</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {generatedCode && (
        <div className="code-result">
          <h3>Generated Code:</h3>
          <div className="code-display">{generatedCode}</div>
          <p className="code-instructions">
            Share this code with the player to claim their account.
            {expiryDays > 0 && ` This code will expire in ${expiryDays} days.`}
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Select Player:</label>
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            disabled={loadingMembers || loading}
            required
          >
            <option value="">-- Select a player --</option>
            {members.map(member => (
              <option key={member.wom_id} value={member.wom_id}>
                {member.name}
              </option>
            ))}
          </select>
          {loadingMembers && <div className="loading-indicator">Loading members...</div>}
          {!loadingMembers && members.length === 0 && (
            <div className="info-message">All players have been claimed</div>
          )}
        </div>
        
        <div className="form-group">
          <label>Expiry (days):</label>
          <input
            type="number"
            min="0"
            value={expiryDays}
            onChange={(e) => setExpiryDays(parseInt(e.target.value))}
            disabled={loading}
          />
          <span className="hint">Set to 0 for no expiry</span>
        </div>
        
        <button
          type="submit"
          className="generate-button"
          disabled={loading || loadingMembers || members.length === 0}
        >
          {loading ? "Generating..." : "Generate Claim Code"}
        </button>
      </form>
    </div>
  );
}
