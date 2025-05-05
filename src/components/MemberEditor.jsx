import React, { useState, useEffect } from "react";
import { useMembers } from "../hooks/useMembers"; // Updated to use new hook
import DatePicker from "react-datepicker";
import { FaSave, FaTimes, FaExclamationTriangle } from "react-icons/fa";
import "react-datepicker/dist/react-datepicker.css";
import "./MemberEditor.css";

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
    wom_id: "",
    womrole: "",
    ehb: 0,
    current_xp: 0,
    current_lvl: 0,
    first_xp: 0,
    first_lvl: 0,
    siege_score: 0,
    join_date: new Date(),
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { updateMember, refreshMembers } = useMembers(); // Use the new hook
  
  // Initialize form data when member prop changes
  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || "",
        wom_name: member.wom_name || "",
        wom_id: member.wom_id || "",
        womrole: member.womrole || "",
        ehb: Math.floor(member.ehb) || 0, // Floor the EHB value to remove decimals
        current_xp: member.current_xp || 0,
        current_lvl: member.current_lvl || 0,
        first_xp: member.first_xp || 0,
        first_lvl: member.first_lvl || 0,
        siege_score: member.siege_score || 0,
        join_date: member.join_date ? new Date(member.join_date) : new Date(),
      });
    } else {
      // Reset form for new member
      setFormData({
        name: "",
        wom_name: "",
        wom_id: "",
        womrole: "Opal", // Default to Opal
        ehb: 0,
        current_xp: 0,
        current_lvl: 0,
        first_xp: 0,
        first_lvl: 0,
        siege_score: 0,
        join_date: new Date(),
      });
    }
  }, [member]);
  
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // For number inputs, convert them all to integers (whole numbers)
    const processedValue = type === 'number' 
      ? (value === '' ? 0 : Math.floor(parseFloat(value))) // Use Math.floor to ensure whole numbers
      : value;
      
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };
  
  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      join_date: date
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
  
    try {
      // Ensure we have a wom_id before proceeding
      if (!formData.wom_id) {
        throw new Error("Member ID (WOM ID) is required for updates");
      }
      
      // Prepare data for submission with proper type conversions
      const memberData = {
        ...formData,
        wom_id: String(formData.wom_id).trim(), // Ensure wom_id is a clean string
        // Convert all numeric fields to integers
        siege_score: Math.floor(Number(formData.siege_score)) || 0,
        ehb: Math.floor(Number(formData.ehb)) || 0, // Ensure EHB is an integer
        current_xp: Number(formData.current_xp) || 0,
        current_lvl: Math.floor(Number(formData.current_lvl)) || 0,
        first_xp: Number(formData.first_xp) || 0,
        first_lvl: Math.floor(Number(formData.first_lvl)) || 0,
        updated_at: new Date().toISOString(),
      };
  
      // Double check that wom_id is present after processing
      if (!memberData.wom_id) {
        throw new Error("WOM ID is empty or invalid after processing");
      }
  
      console.log("Submitting member data:", memberData);
  
      // Use the hook's updateMember method
      let result;
      try {
        result = await updateMember(memberData);
        console.log("Update result:", result);
      } catch (updateError) {
        throw updateError;
      }
  
      // Refresh the members data
      await refreshMembers();
  
      // Create a safe result object that always has the required fields
      const safeResult = result && typeof result === 'object'
        ? { ...memberData, ...result }
        : memberData;
  
      // Make sure the final object has a wom_id
      if (!safeResult.wom_id) {
        safeResult.wom_id = memberData.wom_id;
      }
  
      // Call the onSave callback with the safe data
      if (typeof onSave === 'function') {
        onSave(safeResult);
      } else {
        console.warn("onSave is not a function");
      }
    } catch (err) {
      console.error("Error saving member:", err);
      setError(
        "Failed to save member: " + (err.message || JSON.stringify(err))
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="ui-member-editor">
      {error && (
        <div className="ui-error-message">
          <FaExclamationTriangle className="ui-error-icon" />
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="ui-form-group">
          <label className="ui-form-label" htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="ui-form-input"
            required
          />
        </div>
        
        <div className="ui-form-row">
          <div className="ui-form-col">
            <div className="ui-form-group">
              <label className="ui-form-label" htmlFor="wom_id">WOM ID:</label>
              <input
                type="text"
                id="wom_id"
                name="wom_id"
                value={formData.wom_id}
                onChange={handleChange}
                className="ui-form-input"
              />
            </div>
          </div>
          <div className="ui-form-col">
            <div className="ui-form-group">
              <label className="ui-form-label" htmlFor="wom_name">WOM Name:</label>
              <input
                type="text"
                id="wom_name"
                name="wom_name"
                value={formData.wom_name}
                onChange={handleChange}
                className="ui-form-input"
              />
            </div>
          </div>
        </div>
        
        <div className="ui-form-row">
          <div className="ui-form-col">
            <div className="ui-form-group">
              <label className="ui-form-label" htmlFor="womrole">Clan Rank:</label>
              <select
                id="womrole"
                name="womrole"
                value={formData.womrole}
                onChange={handleChange}
                className="ui-form-select"
              >
                <option value="">-- Select Rank --</option>
                {WOMROLE_OPTIONS.map((role) => (
                  <option key={role} value={role.toLowerCase()}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="ui-form-col">
            <div className="ui-form-group">
              <label className="ui-form-label" htmlFor="join_date">Join Date:</label>
              <div className="ui-date-picker-wrapper">
                <DatePicker
                  id="join_date"
                  selected={formData.join_date}
                  onChange={handleDateChange}
                  className="ui-form-input"
                  dateFormat="yyyy-MM-dd"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="ui-section-header">
          <h4>Experience Tracking</h4>
        </div>
        
        <div className="ui-form-row">
          <div className="ui-form-col">
            <div className="ui-form-group">
              <label className="ui-form-label" htmlFor="current_lvl">Current Level:</label>
              <input
                type="number"
                id="current_lvl"
                name="current_lvl"
                value={formData.current_lvl}
                onChange={handleChange}
                className="ui-form-input ui-number-input"
                min="0"
              />
            </div>
          </div>
          <div className="ui-form-col">
            <div className="ui-form-group">
              <label className="ui-form-label" htmlFor="current_xp">Current XP:</label>
              <input
                type="number"
                id="current_xp"
                name="current_xp"
                value={formData.current_xp}
                onChange={handleChange}
                className="ui-form-input ui-number-input"
                min="0"
              />
            </div>
          </div>
        </div>
        
        <div className="ui-form-row">
          <div className="ui-form-col">
            <div className="ui-form-group">
              <label className="ui-form-label" htmlFor="first_lvl">Initial Level:</label>
              <input
                type="number"
                id="first_lvl"
                name="first_lvl"
                value={formData.first_lvl}
                onChange={handleChange}
                className="ui-form-input ui-number-input"
                min="0"
              />
            </div>
          </div>
          <div className="ui-form-col">
            <div className="ui-form-group">
              <label className="ui-form-label" htmlFor="first_xp">Initial XP:</label>
              <input
                type="number"
                id="first_xp"
                name="first_xp"
                value={formData.first_xp}
                onChange={handleChange}
                className="ui-form-input ui-number-input"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="ui-section-header">
          <h4>Stats & Scoring</h4>
        </div>
        
        <div className="ui-form-row">
          <div className="ui-form-col">
            <div className="ui-form-group">
              <label className="ui-form-label" htmlFor="ehb">EHB:</label>
              <input
                type="number"
                id="ehb"
                name="ehb"
                value={formData.ehb}
                onChange={handleChange}
                className="ui-form-input ui-number-input"
                min="0"
              />
            </div>
          </div>
          <div className="ui-form-col">
            <div className="ui-form-group">
              <label className="ui-form-label" htmlFor="siege_score">Siege Score:</label>
              <input
                type="number"
                id="siege_score"
                name="siege_score"
                value={formData.siege_score}
                onChange={handleChange}
                className="ui-form-input ui-number-input"
                min="0"
              />
            </div>
          </div>
        </div>
        
        <div className="ui-form-actions">
          <button 
            type="button" 
            className="ui-button ui-button-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            <FaTimes className="ui-button-icon" />
            Cancel
          </button>

          <button 
            type="submit" 
            className="ui-button ui-button-primary"
            disabled={isSubmitting}
          >
            <FaSave className="ui-button-icon" />
            {isSubmitting ? "Saving..." : (member ? "Update Member" : "Add Member")}
          </button>
        </div>
      </form>
    </div>
  );
}
