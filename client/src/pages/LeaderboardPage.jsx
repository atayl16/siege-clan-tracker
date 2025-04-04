import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import "./LeaderboardPage.css";

// Helper function to safely parse integers
const safeParseInt = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
};

export default function LeaderboardPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const { data, error } = await supabase.from("members").select("*");
        if (error) throw error;
        
        // Process the data to ensure siege_score is numeric
        const processedData = data.map(member => ({
          ...member,
          siege_score: safeParseInt(member.siege_score)
        }));
        
        // Sort by siege_score in descending order
        const sortedData = processedData
          .filter(member => member.siege_score > 0)
          .sort((a, b) => b.siege_score - a.siege_score);
        
        setMembers(sortedData);
      } catch (err) {
        console.error("Error fetching members:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, []);

  return (
    <div className="leaderboard-container">
      <h1 className="page-title">Siege Leaderboard</h1>
      {loading && <div className="alert alert-info">Loading leaderboard data...</div>}
      {error && <div className="alert alert-danger">Error: {error}</div>}
      <div className="leaderboard-table-container">
        <table className="table table-dark table-striped table-hover">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center">No players with siege scores found</td>
              </tr>
            ) : (
              members.map((member, index) => (
                <tr key={member.wom_id || index}>
                  <td>{index + 1}</td>
                  <td>{member.name || member.wom_name || "Unknown"}</td>
                  <td>{member.siege_score.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
