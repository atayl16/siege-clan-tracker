import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const WOMROLE_OPTIONS = [
  // Admin roles
  "Owner", "Deputy Owner", "General", "Captain", "PvM Organizer",
  // Skiller roles
  "Opal", "Sapphire", "Emerald", "Ruby", "Diamond", "Dragonstone", "Onyx", "Zenyte",
  // Fighter roles
  "Mentor", "Prefect", "Leader", "Supervisor", "Superior", "Executive", "Senator", "Monarch", "TzKal"
];

export default function MemberEditor({ member, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    wom_name: "",
    womrole: "",
    ehb: 0,
    current_xp: 0,
    first_xp: 0,
    siege_score: 0
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize form data when member prop changes
  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || "",
        wom_name: member.wom_name || "",
        womrole: member.womrole || "",
        ehb: member.ehb || 0,
        current_xp: member.current_xp || 0,
        first_xp: member.first_xp || 0,
        siege_score: member.siege_score || 0
      });
    }
  }, [member]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // If it's an existing member, update it
      if (member?.wom_id) {
        // Use Supabase directly instead of the API
        const { data, error } = await supabase
          .from('members')
          .update(formData)
          .eq('wom_id', member.wom_id)
          .select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          onSave(data[0]);
        } else {
          throw new Error("Failed to update member: No data returned");
        }
      } 
      // Otherwise, create a new member
      else {
        // Create a new wom_id if it's not provided
        const newFormData = { 
          ...formData,
          wom_id: formData.wom_id || `temp_${Date.now()}` // Generate a temporary ID if none exists
        };
        
        // Use Supabase directly
        const { data, error } = await supabase
          .from('members')
          .insert([newFormData])
          .select();
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          onSave(data[0]);
        } else {
          throw new Error("Failed to create member: No data returned");
        }
      }
    } catch (err) {
      console.error("Error saving member:", err);
      setError(`Failed to save member data: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="member-editor">
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="wom_name">WOM Username:</label>
          <input
            type="text"
            id="wom_name"
            name="wom_name"
            value={formData.wom_name}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="womrole">Role:</label>
          <select
            id="womrole"
            name="womrole"
            value={formData.womrole}
            onChange={handleChange}
            className="form-control"
          >
            <option value="">Select a role...</option>
            {WOMROLE_OPTIONS.map(role => (
              <option key={role} value={role.toLowerCase()}>
                {role}
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="ehb">EHB:</label>
          <input
            type="number"
            id="ehb"
            name="ehb"
            value={formData.ehb}
            onChange={handleChange}
            className="form-control"
            min="0"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="first_xp">Initial XP:</label>
          <input
            type="number"
            id="first_xp"
            name="first_xp"
            value={formData.first_xp}
            onChange={handleChange}
            className="form-control"
            min="0"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="current_xp">Current XP:</label>
          <input
            type="number"
            id="current_xp"
            name="current_xp"
            value={formData.current_xp}
            onChange={handleChange}
            className="form-control"
            min="0"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="siege_score">Siege Score:</label>
          <input
            type="number"
            id="siege_score"
            name="siege_score"
            value={formData.siege_score}
            onChange={handleChange}
            className="form-control"
            min="0"
          />
        </div>
        
        <div className="button-group">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Member"}
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
