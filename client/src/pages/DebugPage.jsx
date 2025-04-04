import React, { useState, useEffect } from 'react';

export default function DebugPage() {
  const [members, setMembers] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/members')
      .then(res => res.json())
      .then(data => {
        console.log("Members data:", data);
        setMembers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching members:", err);
        setError(err.toString());
        setLoading(false);
      });
  }, []);

  return (
    <div style={{padding: '20px', backgroundColor: '#111', color: 'white', minHeight: '100vh'}}>
      <h1>Debug Page</h1>
      
      <div style={{marginBottom: '20px'}}>
        <h2>API Status</h2>
        <ul>
          <li>Loading: {loading ? 'Yes' : 'No'}</li>
          <li>Error: {error ? error : 'None'}</li>
          <li>Members: {members ? members.length : 'Not loaded'}</li>
        </ul>
      </div>
      
      {loading && <p>Loading data...</p>}
      {error && <p style={{color: 'red'}}>Error: {error}</p>}
      
      {members && (
        <div>
          <h2>Members Data</h2>
          {members.length === 0 ? (
            <p>No members found in database. Please add some test data.</p>
          ) : (
            <pre style={{background: '#222', padding: '10px', color: '#eee', overflowX: 'auto'}}>
              {JSON.stringify(members, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
