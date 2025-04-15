import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import DatePicker from "react-datepicker";
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
    title: "",
    womrole: "",
    ehb: 0,
    current_xp: 0,
    current_lvl: 0,
    first_xp: 0,
    first_lvl: 0,
    siege_score: 0,
    created_at: new Date(),
    siege_competition_place: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Initialize form data when member prop changes
  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || "",
        wom_name: member.wom_name || "",
        wom_id: member.wom_id || "",
        title: member.title || "",
        womrole: member.womrole || "",
        ehb: member.ehb || 0,
        current_xp: member.current_xp || 0,
        current_lvl: member.current_lvl || 0,
        first_xp: member.first_xp || 0,
        first_lvl: member.first_lvl || 0,
        siege_score: member.siege_score || 0,
        created_at: member.created_at ? new Date(member.created_at) : new Date(),
        siege_competition_place: member.siege_competition_place || ""
      });
    } else {
      // Reset form for new member
      setFormData({
        name: "",
        wom_name: "",
        wom_id: "",
        title: "",
        womrole: "Opal", // Default to Opal
        ehb: 0,
        current_xp: 0,
        current_lvl: 0,
        first_xp: 0,
        first_lvl: 0,
        siege_score: 0,
        created_at: new Date(),
        siege_competition_place: ""
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
      created_at: date
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
        updated_at: new Date().toISOString()
      };
      
      // Use Supabase upsert to handle both creating and updating
      const { error } = await supabase
        .from('members')
        .upsert(memberData, { 
          onConflict: 'wom_id',
          returning: 'minimal' 
        });
      
      if (error) throw error;
      
      // Call the onSave callback with the updated data
      onSave(memberData);
      
    } catch (err) {
      console.error("Error saving member:", err);
      setError("Failed to save member: " + err.message);
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
        
        <div className="row">
          <div className="col-md-6">
            <div className="form-group">
              <label htmlFor="wom_id">WOM ID:</label>
              <input
                type="text"
                id="wom_id"
                name="wom_id"
                value={formData.wom_id}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group">
              <label htmlFor="wom_name">WOM Name:</label>
              <input
                type="text"
                id="wom_name"
                name="wom_name"
                value={formData.wom_name}
                onChange={handleChange}
                className="form-control"
              />
            </div>
          </div>
        </div>
        
        <div className="row">
          <div className="col-md-6">
            <div className="form-group">
              <label htmlFor="title">Title:</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. Clan Leader"
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group">
              <label htmlFor="womrole">Clan Rank:</label>
              <select
                id="womrole"
                name="womrole"
                value={formData.womrole}
                onChange={handleChange}
                className="form-control"
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
        </div>
        
        <div className="row">
          <div className="col-md-6">
            <div className="form-group">
              <label htmlFor="current_lvl">Current Level:</label>
              <input
                type="number"
                id="current_lvl"
                name="current_lvl"
                value={formData.current_lvl}
                onChange={handleChange}
                className="form-control"
                min="0"
              />
            </div>
          </div>
          <div className="col-md-6">
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
          </div>
        </div>
        
        <div className="row">
          <div className="col-md-6">
            <div className="form-group">
              <label htmlFor="first_lvl">Initial Level:</label>
              <input
                type="number"
                id="first_lvl"
                name="first_lvl"
                value={formData.first_lvl}
                onChange={handleChange}
                className="form-control"
                min="0"
              />
            </div>
          </div>
          <div className="col-md-6">
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
          </div>
        </div>
        
        <div className="row">
          <div className="col-md-6">
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
          </div>
          <div className="col-md-6">
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
          </div>
        </div>
        
        <div className="row">
          <div className="col-md-6">
            <div className="form-group">
              <label htmlFor="created_at">Join Date:</label>
              <DatePicker
                id="created_at"
                selected={formData.created_at}
                onChange={handleDateChange}
                className="form-control"
                dateFormat="yyyy-MM-dd"
              />
            </div>
          </div>
          <div className="col-md-6">
            <div className="form-group">
              <label htmlFor="siege_competition_place">Siege Competition Place:</label>
              <input
                type="text"
                id="siege_competition_place"
                name="siege_competition_place"
                value={formData.siege_competition_place}
                onChange={handleChange}
                className="form-control"
                placeholder="e.g. 1st, 2nd, 3rd"
              />
            </div>
          </div>
        </div>
        
        <div className="button-group">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : (member ? "Update Member" : "Add Member")}
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
