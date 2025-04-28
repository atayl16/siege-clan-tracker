import React, { useState, useEffect } from "react";
import { useMembers, useData } from "../context/DataContext";
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
  const { fetchers } = useData();  
  const { refreshMembers } = useMembers();
  
  // Initialize form data when member prop changes
  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || "",
        wom_name: member.wom_name || "",
        wom_id: member.wom_id || "",
        womrole: member.womrole || "",
        ehb: member.ehb || 0,
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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseInt(value, 10)) : value
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
      // Prepare data for submission
      const memberData = {
        ...formData,
        updated_at: new Date().toISOString(),
      };

      // Use DataContext instead of direct Supabase call
      const result = await fetchers.supabase.updateMember(memberData);

      // Refresh the members data in the SWR cache
      refreshMembers();

      // Call the onSave callback with the updated data
      onSave(result || memberData);
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
