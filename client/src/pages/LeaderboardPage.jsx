import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import Leaderboard from "../components/Leaderboard";
import "./LeaderboardPage.css";

export default function LeaderboardPage() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const { data, error } = await supabase.from("members").select("*");
        if (error) throw error;
        setMembers(data);
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
        <Leaderboard members={members} showTitle={false} />
      </div>
    </div>
  );
}
