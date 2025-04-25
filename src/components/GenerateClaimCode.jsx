import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { FaKey, FaCheckCircle, FaExclamationTriangle, FaCopy } from "react-icons/fa";

// Import UI components
import Card from "./ui/Card";
import Button from "./ui/Button";
import SelectDropdown from "./ui/SelectDropdown";
import FormInput from "./ui/FormInput";

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

  const copyToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode)
        .then(() => {
          setSuccess("Code copied to clipboard!");
        })
        .catch(err => {
          console.error("Failed to copy code:", err);
        });
    }
  };

  return (
    <div className="ui-generate-claim-code">
      <Card variant="dark">
        <Card.Header>
          <h2 className="ui-section-title">
            <FaKey className="ui-icon-left" /> Generate Player Claim Code
          </h2>
        </Card.Header>
        
        <Card.Body>
          {error && (
            <div className="ui-message ui-message-error">
              <FaExclamationTriangle className="ui-message-icon" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="ui-message ui-message-success">
              <FaCheckCircle className="ui-message-icon" />
              <span>{success}</span>
            </div>
          )}
          
          {generatedCode && (
            <div className="ui-code-result">
              <h3 className="ui-code-title">Generated Code:</h3>
              <div className="ui-code-display">
                <span>{generatedCode}</span>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="ui-copy-button" 
                  onClick={copyToClipboard}
                  icon={<FaCopy />}
                  title="Copy to clipboard"
                />
              </div>
              <p className="ui-code-instructions">
                Share this code with the player to claim their account.
                {expiryDays > 0 && ` This code will expire in ${expiryDays} days.`}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="ui-claim-code-form">
            <div className="ui-form-group">
              <label className="ui-form-label">Select Player:</label>
              <SelectDropdown
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                options={members.map(member => ({
                  value: member.wom_id,
                  label: member.name
                }))}
                placeholder="-- Select a player --"
                disabled={loadingMembers || loading}
                required
              />
              {loadingMembers && (
                <div className="ui-loading-text">Loading members...</div>
              )}
              {!loadingMembers && members.length === 0 && (
                <div className="ui-info-message">All players have been claimed</div>
              )}
            </div>
            
            <div className="ui-form-group">
              <FormInput
                id="expiryDays"
                label="Expiry (days):"
                type="number"
                min="0"
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                disabled={loading}
              />
              <span className="ui-field-help">Set to 0 for no expiry</span>
            </div>
            
            <div className="ui-form-actions">
              <Button
                type="submit"
                variant="primary"
                disabled={loading || loadingMembers || members.length === 0}
                icon={<FaKey />}
              >
                {loading ? "Generating..." : "Generate Claim Code"}
              </Button>
            </div>
          </form>
        </Card.Body>
      </Card>
    </div>
  );
}
